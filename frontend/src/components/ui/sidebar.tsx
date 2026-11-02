import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import '../../styles/sidebar.css';

const SIDEBAR_STORAGE_KEY = 'saia_sidebar_open';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

interface SidebarContextProps {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar(): SidebarContextProps {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de un <SidebarProvider>.');
  }
  return context;
}

interface SidebarProviderProps extends React.ComponentProps<'div'> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className = '',
  style,
  children,
  ...props
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  const [_open, _setOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return defaultOpen;
  });

  const open = openProp ?? _open;

  const setOpen = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(openState));
    },
    [setOpenProp, open]
  );

  const toggleSidebar = useCallback(() => {
    setOpen((prev) => !prev);
  }, [setOpen]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state: 'expanded' | 'collapsed' = open ? 'expanded' : 'collapsed';

  const contextValue = useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        className={`saia-sidebar-provider ${className}`.trim()}
        style={style}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

interface SidebarUIProps extends React.ComponentProps<'aside'> {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export const Sidebar: React.FC<SidebarUIProps> = ({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'icon',
  className = '',
  children,
  ...props
}) => {
  const { state } = useSidebar();

  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsible}
      data-variant={variant}
      data-side={side}
      className={`saia-sidebar ${className}`.trim()}
      {...props}
    >
      {children}
    </aside>
  );
};

export const SidebarHeader: React.FC<React.ComponentProps<'div'>> = ({
  className = '',
  children,
  ...props
}) => (
  <div data-slot="sidebar-header" className={`saia-sidebar-header ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const SidebarContent: React.FC<React.ComponentProps<'div'>> = ({
  className = '',
  children,
  ...props
}) => (
  <div data-slot="sidebar-content" className={`saia-sidebar-content ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const SidebarFooter: React.FC<React.ComponentProps<'div'>> = ({
  className = '',
  children,
  ...props
}) => (
  <div data-slot="sidebar-footer" className={`saia-sidebar-footer ${className}`.trim()} {...props}>
    {children}
  </div>
);

interface SidebarGroupProps extends React.ComponentProps<'div'> {
  defaultOpen?: boolean;
  collapsible?: boolean;
}

const GroupContext = createContext<{ open: boolean; toggle: () => void; collapsible: boolean }>({
  open: true,
  toggle: () => {},
  collapsible: false,
});

export const SidebarGroup: React.FC<SidebarGroupProps> = ({
  defaultOpen = true,
  collapsible = false,
  className = '',
  children,
  ...props
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const { state } = useSidebar();
  const isSidebarCollapsed = state === 'collapsed';

  return (
    <GroupContext.Provider
      value={{
        open: isSidebarCollapsed ? true : open,
        toggle: () => setOpen((p) => !p),
        collapsible,
      }}
    >
      <div
        data-slot="sidebar-group"
        data-group-open={isSidebarCollapsed ? 'true' : String(open)}
        className={`saia-sidebar-group ${isSidebarCollapsed ? 'saia-sidebar-collapsed-group' : ''} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
};

export const SidebarGroupLabel: React.FC<React.ComponentProps<'div'>> = ({
  className = '',
  children,
  ...props
}) => {
  const { toggle, collapsible } = useContext(GroupContext);

  if (collapsible) {
    return (
      <button
        type="button"
        onClick={toggle}
        data-slot="sidebar-group-label"
        className={`saia-sidebar-group-label ${className}`.trim()}
      >
        <span>{children}</span>
        <svg
          className="saia-sidebar-group-chevron"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    );
  }

  return (
    <div data-slot="sidebar-group-label" className={`saia-sidebar-group-label ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const SidebarGroupContent: React.FC<React.ComponentProps<'div'>> = ({
  className = '',
  children,
  ...props
}) => (
  <div data-slot="sidebar-group-content" className={`saia-sidebar-group-content ${className}`.trim()} {...props}>
    {children}
  </div>
);

export const SidebarMenu: React.FC<React.ComponentProps<'ul'>> = ({
  className = '',
  children,
  ...props
}) => (
  <ul data-slot="sidebar-menu" className={`saia-sidebar-menu ${className}`.trim()} {...props}>
    {children}
  </ul>
);

export const SidebarMenuItem: React.FC<React.ComponentProps<'li'>> = ({
  className = '',
  children,
  ...props
}) => (
  <li data-slot="sidebar-menu-item" className={`saia-sidebar-menu-item ${className}`.trim()} {...props}>
    {children}
  </li>
);

interface SidebarMenuButtonProps extends React.ComponentProps<'button'> {
  isActive?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton: React.FC<SidebarMenuButtonProps> = ({
  isActive = false,
  tooltip,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      type="button"
      data-slot="sidebar-menu-button"
      data-active={isActive ? 'true' : 'false'}
      title={tooltip}
      className={`saia-sidebar-menu-button ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};

export const SidebarMenuBadge: React.FC<React.ComponentProps<'span'>> = ({
  className = '',
  children,
  ...props
}) => (
  <span data-slot="sidebar-menu-badge" className={`saia-sidebar-menu-badge ${className}`.trim()} {...props}>
    {children}
  </span>
);

export const SidebarMenuSub: React.FC<React.ComponentProps<'ul'>> = ({
  className = '',
  children,
  ...props
}) => (
  <ul data-slot="sidebar-menu-sub" className={`saia-sidebar-menu-sub ${className}`.trim()} {...props}>
    {children}
  </ul>
);

export const SidebarMenuSubItem: React.FC<React.ComponentProps<'li'>> = ({
  className = '',
  children,
  ...props
}) => (
  <li data-slot="sidebar-menu-sub-item" className={className} {...props}>
    {children}
  </li>
);

interface SidebarMenuSubButtonProps extends React.ComponentProps<'button'> {
  isActive?: boolean;
}

export const SidebarMenuSubButton: React.FC<SidebarMenuSubButtonProps> = ({
  isActive = false,
  className = '',
  children,
  ...props
}) => (
  <button
    type="button"
    data-slot="sidebar-menu-sub-button"
    data-active={isActive ? 'true' : 'false'}
    className={`saia-sidebar-menu-sub-button ${className}`.trim()}
    {...props}
  >
    {children}
  </button>
);

export const SidebarTrigger: React.FC<React.ComponentProps<'button'>> = ({
  className = '',
  onClick,
  ...props
}) => {
  const { toggleSidebar, state } = useSidebar();

  return (
    <button
      type="button"
      data-slot="sidebar-trigger"
      className={`saia-sidebar-trigger ${className}`.trim()}
      title={state === 'expanded' ? 'Contraer menú lateral (Ctrl+B)' : 'Expandir menú lateral (Ctrl+B)'}
      aria-label="Alternar barra lateral"
      onClick={(e) => {
        onClick?.(e);
        toggleSidebar();
      }}
      {...props}
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    </button>
  );
};

export const SidebarRail: React.FC<React.ComponentProps<'button'>> = ({
  className = '',
  ...props
}) => {
  const { toggleSidebar, state } = useSidebar();

  return (
    <button
      type="button"
      data-slot="sidebar-rail"
      aria-label="Alternar barra lateral"
      tabIndex={-1}
      onClick={toggleSidebar}
      title={state === 'expanded' ? 'Contraer barra lateral (Ctrl+B)' : 'Expandir barra lateral (Ctrl+B)'}
      className={`saia-sidebar-rail ${className}`.trim()}
      {...props}
    />
  );
};

export const SidebarInset: React.FC<React.ComponentProps<'main'>> = ({
  className = '',
  children,
  ...props
}) => (
  <main data-slot="sidebar-inset" className={`saia-sidebar-inset ${className}`.trim()} {...props}>
    {children}
  </main>
);

