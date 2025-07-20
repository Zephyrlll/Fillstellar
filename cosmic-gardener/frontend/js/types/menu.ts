export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  action?: () => void;
  submenu?: MenuItem[];
  visible?: boolean;
  enabled?: boolean;
  badge?: string | number;
  customClass?: string;
}

export interface RadialMenuConfig {
  centerIcon: string;
  centerLabel?: string;
  radius: number;
  itemRadius: number;
  startAngle: number;
  items: MenuItem[];
}

export interface SlideMenuConfig {
  position: 'left' | 'right';
  width: number;
  sections: MenuSection[];
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export type MenuTheme = 'dark' | 'light' | 'cosmic';

export interface MenuStyles {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  hoverColor: string;
  activeColor: string;
  iconSize: number;
}