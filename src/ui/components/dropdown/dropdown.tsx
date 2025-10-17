import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingList,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useHover,
  useInteractions,
  useListItem,
  useListNavigation,
  useMergeRefs,
  useRole,
  useTypeahead
} from '@floating-ui/react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import * as React from 'react';

const MenuContext = React.createContext<{
  getItemProps: (
    userProps?: React.HTMLProps<HTMLElement>
  ) => Record<string, unknown>;
  activeIndex: number | null;
  setActiveIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setHasFocusInside: React.Dispatch<React.SetStateAction<boolean>>;
  isOpen: boolean;
}>({
  getItemProps: () => ({}),
  activeIndex: null,
  setActiveIndex: () => {},
  setHasFocusInside: () => {},
  isOpen: false
});

// The trigger prop is now more specific, avoiding the need for `any` type casting.
interface MenuProps {
  label: string;
  nested?: boolean;
  children?: React.ReactNode;
  trigger?: React.ReactElement; // Optional trigger prop
}

const menuItemStyle =
  'p-1 flex justify-between items-center bg-background w-full border-none rounded text-sm text-left leading-loose min-w-27.5 m-0 outline-none focus:bg-secondary-background focus:text-secondary-blue data-[nested]:data-[open]:not([data-focus-inside]):bg-secondary-background data-[nested]:data-[open]:not([data-focus-inside]):text-white data-[focus-inside]:data-[open]:bg-secondary-background';
const rootMenuStyle =
  'px-3.5 py-1.5 border border-purple text-sm bg-background rounded-md data-[open]:bg-secondary-background hover:bg-secondary-background';
const menuStyle =
  'bg-background border border-purple backdrop-blur-sm p-1 rounded-md shadow-lg outline-none';

export const MenuComponent = React.forwardRef<
  HTMLButtonElement,
  MenuProps & React.HTMLProps<HTMLButtonElement>
>(function MenuComponent({ children, label, trigger, ...props }, forwardedRef) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hasFocusInside, setHasFocusInside] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const elementsRef = React.useRef<Array<HTMLButtonElement | null>>([]);
  const labelsRef = React.useRef<Array<string | null>>([]);
  const parent = React.useContext(MenuContext);

  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const item = useListItem();

  const isNested = parentId != null;

  const { floatingStyles, refs, context } = useFloating<HTMLButtonElement>({
    nodeId,
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: isNested ? 'right-start' : 'bottom-start',
    middleware: [
      offset({ mainAxis: isNested ? 0 : 4, alignmentAxis: isNested ? -4 : 0 }),
      flip(),
      shift()
    ],
    whileElementsMounted: autoUpdate
  });

  // The `ref` prop is not publicly exposed on the `ReactElement` type.
  // We use a type assertion to extract it from the trigger element so that
  // we can merge it with the refs we need for positioning and interactions.
  const triggerRef = trigger ? (trigger as { ref?: React.Ref<HTMLButtonElement> }).ref : undefined;

  const mergedRef = useMergeRefs([
    refs.setReference,
    item.ref,
    forwardedRef,
    triggerRef,
  ]);

  const hover = useHover(context, {
    enabled: isNested,
    delay: { open: 75 },
    handleClose: safePolygon({ blockPointerEvents: true })
  });
  const click = useClick(context, {
    event: 'mousedown',
    toggle: !isNested,
    ignoreMouse: isNested
  });
  const role = useRole(context, { role: 'menu' });
  const dismiss = useDismiss(context, { bubbles: true });
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    nested: isNested,
    onNavigate: setActiveIndex
  });
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    onMatch: isOpen ? setActiveIndex : undefined,
    activeIndex
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [hover, click, role, dismiss, listNavigation, typeahead]
  );

  React.useEffect(() => {
    if (!tree) return;

    function handleTreeClick() {
      setIsOpen(false);
    }

    function onSubMenuOpen(event: { nodeId: string; parentId: string }) {
      if (event.nodeId !== nodeId && event.parentId === parentId) {
        setIsOpen(false);
      }
    }

    tree.events.on('click', handleTreeClick);
    tree.events.on('menuopen', onSubMenuOpen);

    return () => {
      tree.events.off('click', handleTreeClick);
      tree.events.off('menuopen', onSubMenuOpen);
    };
  }, [tree, nodeId, parentId]);

  React.useEffect(() => {
    if (isOpen && tree) {
      tree.events.emit('menuopen', { parentId, nodeId });
    }
  }, [tree, isOpen, nodeId, parentId]);

  // The trigger is rendered conditionally. If a custom trigger element is provided,
  // we clone it and pass the necessary props. Otherwise, a default button is rendered.
  const triggerNode = trigger ? (
    React.cloneElement(
      trigger,
      {
        ref: mergedRef,
        tabIndex:
          !isNested ? undefined : parent.activeIndex === item.index ? 0 : -1,
        role: isNested ? 'menuitem' : undefined,
        'data-open': isOpen ? '' : undefined,
        'data-nested': isNested ? '' : undefined,
        'data-focus-inside': hasFocusInside ? '' : undefined,
        // Class names are combined safely without needing `any`.
        className: [
            trigger.props.className,
            isNested ? menuItemStyle : rootMenuStyle
        ].filter(Boolean).join(' '),
        ...getReferenceProps(
          parent.getItemProps({
            ...props,
            onFocus(event: React.FocusEvent<HTMLButtonElement>) {
              props.onFocus?.(event);
              setHasFocusInside(false);
              parent.setHasFocusInside(true);
            }
          })
        )
      }
    )
  ) : (
    <button
      ref={mergedRef}
      tabIndex={
        !isNested ? undefined : parent.activeIndex === item.index ? 0 : -1
      }
      role={isNested ? 'menuitem' : undefined}
      data-open={isOpen ? '' : undefined}
      data-nested={isNested ? '' : undefined}
      data-focus-inside={hasFocusInside ? '' : undefined}
      className={isNested ? menuItemStyle : rootMenuStyle}
      {...getReferenceProps(
        parent.getItemProps({
          ...props,
          onFocus(event: React.FocusEvent<HTMLButtonElement>) {
            props.onFocus?.(event);
            setHasFocusInside(false);
            parent.setHasFocusInside(true);
          }
        })
      )}
    >
      <div className="flex items-center">
        <span className="text-sm font-semibold">{label}</span>
        <ChevronDown size={16} className="ml-1" />
      </div>
      {isNested && (
        <span aria-hidden style={{ marginLeft: 10, fontSize: 10 }}>
          <ChevronRight className="text-secondary-blue" size={16} />
        </span>
      )}
    </button>
  );

  return (
    <FloatingNode id={nodeId}>
      {triggerNode}
      <MenuContext.Provider
        value={{
          activeIndex,
          setActiveIndex,
          getItemProps,
          setHasFocusInside,
          isOpen
        }}
      >
        <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
          {isOpen && (
            <FloatingPortal>
              <FloatingFocusManager
                context={context}
                modal={false}
                initialFocus={isNested ? -1 : 0}
                returnFocus={!isNested}
              >
                <div
                  ref={refs.setFloating}
                  className={menuStyle}
                  style={floatingStyles}
                  {...getFloatingProps()}
                >
                  {children}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          )}
        </FloatingList>
      </MenuContext.Provider>
    </FloatingNode>
  );
});

interface MenuItemProps {
  label: string;
  disabled?: boolean;
}

export const MenuItem = React.forwardRef<
  HTMLButtonElement,
  MenuItemProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function MenuItem({ label, disabled, ...props }, forwardedRef) {
  const menu = React.useContext(MenuContext);
  const item = useListItem({ label: disabled ? null : label });
  const tree = useFloatingTree();
  const isActive = item.index === menu.activeIndex;

  // Moved `useMergeRefs` to the top level to follow the Rules of Hooks.
  const mergedRef = useMergeRefs([item.ref, forwardedRef]);

  return (
    <button
      {...props}
      ref={mergedRef}
      type="button"
      role="menuitem"
      className={menuItemStyle}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      {...menu.getItemProps({
        onClick(event: React.MouseEvent<HTMLButtonElement>) {
          props.onClick?.(event);
          tree?.events.emit('click');
        },
        onFocus(event: React.FocusEvent<HTMLButtonElement>) {
          props.onFocus?.(event);
          menu.setHasFocusInside(true);
        }
      })}
    >
      {label}
    </button>
  );
});

export const Menu = React.forwardRef<
  HTMLButtonElement,
  MenuProps & React.HTMLProps<HTMLButtonElement>
>(function Menu(props, ref) {
  const parentId = useFloatingParentNodeId();

  if (parentId === null) {
    return (
      <FloatingTree>
        <MenuComponent {...props} ref={ref} />
      </FloatingTree>
    );
  }

  return <MenuComponent {...props} ref={ref} />;
});
