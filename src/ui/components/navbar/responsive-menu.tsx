'use client';

import { Button } from '../button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useInteractions,
  FloatingFocusManager,
  autoUpdate
} from '@floating-ui/react';
import { motion } from 'motion/react';

export default function ResponsiveMenu({
  children,
  closeButton = false
}: Readonly<{
  children?: React.ReactNode;
  closeButton?: boolean;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  // Floating UI setup
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: 'end'
      }),
      shift({ padding: 8 })
    ],
    placement: 'bottom-end',
    // Add autoUpdate to handle positioning during scroll/resize
    whileElementsMounted: autoUpdate
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss
  ]);

  const menuAnimation = {
    hidden: { opacity: 0, scale: 0.95, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -10 }
  };
  return (
    <div className="">
      <Button
        variant="secondary"
        size="icon"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      <div>
        {isOpen && (
          <FloatingFocusManager context={context} modal={false}>
            <motion.div
              className="bg-white shadow-xl rounded-lg p-4 border border-purple z-50"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={menuAnimation}
              transition={{ duration: 0.2 }}
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              {closeButton && (
                <Button
                  variant="secondary"
                  className="bg-white"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                >
                  <X />
                </Button>
              )}
              {children}
            </motion.div>
          </FloatingFocusManager>
        )}
      </div>
    </div>
  );
}
