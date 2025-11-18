'use client';

import * as React from 'react';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  useMergeRefs,
  FloatingPortal,
  FloatingFocusManager,
  FloatingOverlay,
  useId
} from '@floating-ui/react';
import { motion } from 'motion/react';
import { actionButtonClass } from '@/ui/styles/action-button';

interface DialogOptions {
  initialOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useDialog({
  initialOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen
}: DialogOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);
  const [labelId, setLabelId] = React.useState<string | undefined>();
  const [descriptionId, setDescriptionId] = React.useState<
    string | undefined
  >();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    open,
    onOpenChange: setOpen
  });

  const context = data.context;

  const click = useClick(context, {
    enabled: controlledOpen == null
  });
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
    outsidePress: false
  });
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return React.useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      labelId,
      descriptionId,
      setLabelId,
      setDescriptionId
    }),
    [open, setOpen, interactions, data, labelId, descriptionId]
  );
}

type ContextType =
  | (ReturnType<typeof useDialog> & {
      setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
      setDescriptionId: React.Dispatch<
        React.SetStateAction<string | undefined>
      >;
    })
  | null;

const DialogContext = React.createContext<ContextType>(null);

export const useDialogContext = () => {
  const context = React.useContext(DialogContext);

  if (context == null) {
    throw new Error('Dialog components must be wrapped in <Dialog />');
  }

  return context;
};

export function Dialog({
  children,
  ...options
}: {
  children: React.ReactNode;
} & DialogOptions) {
  const dialog = useDialog(options);
  return (
    <DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
  );
}

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & DialogTriggerProps
>(function DialogTrigger({ children, asChild = false, ...props }, propRef) {
  const context = useDialogContext();
  const childrenRef = React.isValidElement(children) && 'ref' in children ? (children.ref as React.Ref<HTMLElement> | null) : null;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        'data-state': context.open ? 'open' : 'closed'
      })
    );
  }

  return (
    <button
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? 'open' : 'closed'}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
});

interface DialogContentProps {
  layoutClassName?: string;
  type?: 'side' | 'default';
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & DialogContentProps
>(function DialogContent(props, propRef) {
  const { context: floatingContext, ...context } = useDialogContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  if (!floatingContext.open) return null;

  return (
    <FloatingPortal>
      <FloatingOverlay
        className={
          props.layoutClassName ??
          'bg-black/60 grid place-items-center backdrop-blur-sm'
        }
        lockScroll
      >
        <FloatingFocusManager context={floatingContext}>
          <motion.div
            initial={
              props.type === 'side'
                ? { opacity: 0, x: 20 }
                : { opacity: 0, y: 20 }
            }
            animate={
              props.type === 'side'
                ? { opacity: 1, x: 0 }
                : { opacity: 1, y: 0 }
            }
            exit={
              props.type === 'side'
                ? { opacity: 0, x: -20 }
                : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.3 }}
            ref={ref}
            aria-labelledby={context.labelId}
            aria-describedby={context.descriptionId}
            {...context.getFloatingProps(props)}
          >
            {props.children}
          </motion.div>
        </FloatingFocusManager>
      </FloatingOverlay>
    </FloatingPortal>
  );
});

export const DialogHeading = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLProps<HTMLHeadingElement>
>(function DialogHeading({ children, ...props }, ref) {
  const { setLabelId } = useDialogContext();
  const id = useId();

  // Only sets `aria-labelledby` on the Dialog root element
  // if this component is mounted inside it.
  React.useLayoutEffect(() => {
    setLabelId(id);
    return () => setLabelId(undefined);
  }, [id, setLabelId]);

  return (
    <h2 {...props} ref={ref} id={id}>
      {children}
    </h2>
  );
});

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLProps<HTMLParagraphElement>
>(function DialogDescription({ children, ...props }, ref) {
  const { setDescriptionId } = useDialogContext();
  const id = useId();

  // Only sets `aria-describedby` on the Dialog root element
  // if this component is mounted inside it.
  React.useLayoutEffect(() => {
    setDescriptionId(id);
    return () => setDescriptionId(undefined);
  }, [id, setDescriptionId]);

  return (
    <p {...props} ref={ref} id={id}>
      {children}
    </p>
  );
});

interface DialogCloseProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & DialogCloseProps
>(function DialogClose({ children, asChild = false, ...props }, ref) {
  const { setOpen, getReferenceProps } = useDialogContext();

  const handleClick = (event: React.MouseEvent<any>) => {
    props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(false);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      getReferenceProps({
        ref,
        ...props,
        ...children.props,
        onClick: (event: React.MouseEvent<any>) => {
          if (typeof children.props.onClick === 'function') {
            children.props.onClick(event);
          }
          handleClick(event);
        }
      })
    );
  }

  const { className, ...restProps } = props;

  return (
    <button
      type="button"
      {...restProps}
      ref={ref}
      className={actionButtonClass({ variant: 'neutral', className })}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});

export const DialogConfirm = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    onConfirm?: () => void | Promise<boolean>;
    variant?: 'primary' | 'destructive';
  }
>(function DialogConfirm({ onConfirm, variant = 'primary', className, onClick, ...props }, ref) {
  const { setOpen } = useDialogContext();

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(e);
    if (e.defaultPrevented) {
      return;
    }
    const result = onConfirm?.();
    if (result instanceof Promise) {
      result.then((ret) => {
        if (ret !== false) {
          setOpen(false);
        }
      });
    } else {
      setOpen(false);
    }
  };

  return (
    <button
      type="button"
      {...props}
      ref={ref}
      className={actionButtonClass({
        variant: variant === 'destructive' ? 'destructive' : 'primary',
        className
      })}
      onClick={handleConfirm}
    />
  );
});

export const DialogActions = ({
  closeLabel,
  confirmLabel,
  onConfirm,
  confirmVariant = 'primary'
}: Readonly<{
  closeLabel: string;
  confirmLabel: string;
  onConfirm?: () => void;
  confirmVariant?: 'primary' | 'destructive';
}>) => {
  return (
    <div className="flex justify-end gap-2">
      <DialogClose>{closeLabel}</DialogClose>
      <DialogConfirm variant={confirmVariant} onConfirm={onConfirm}>
        {confirmLabel}
      </DialogConfirm>
    </div>
  );
};
