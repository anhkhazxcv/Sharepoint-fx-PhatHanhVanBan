import * as React from 'react';
import {
  Apps20Regular,
  BookOpen20Regular,
  CheckmarkCircle20Regular,
  ClipboardBulletListLtr20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  ClipboardTask20Regular,
  Dismiss20Regular,
  Filter20Regular,
  Folder20Regular,
  NumberSymbol20Regular,
  Person20Regular,
  Search16Regular,
  Shield20Regular
} from '@fluentui/react-icons';

interface IIconProps {
  className?: string;
}

export function SidebarTasksIcon(props: IIconProps): React.ReactElement {
  return <ClipboardTask20Regular className={props.className} />;
}

export function SidebarMyRequestsIcon(props: IIconProps): React.ReactElement {
  return <Person20Regular className={props.className} />;
}

export function SidebarAdminIcon(props: IIconProps): React.ReactElement {
  return <Shield20Regular className={props.className} />;
}

export function SidebarDraftIcon(props: IIconProps): React.ReactElement {
  return <ClipboardBulletListLtr20Regular className={props.className} />;
}

export function SidebarLibraryIcon(props: IIconProps): React.ReactElement {
  return <BookOpen20Regular className={props.className} />;
}

export function SidebarReleaseIcon(props: IIconProps): React.ReactElement {
  return <Folder20Regular className={props.className} />;
}

export function SidebarNumberingIcon(props: IIconProps): React.ReactElement {
  return <NumberSymbol20Regular className={props.className} />;
}

export function SidebarCollapseIcon(props: IIconProps): React.ReactElement {
  return <ChevronLeft20Regular className={props.className} />;
}

export function SidebarExpandIcon(props: IIconProps): React.ReactElement {
  return <ChevronRight20Regular className={props.className} />;
}

export function SearchIcon(props: IIconProps): React.ReactElement {
  return <Search16Regular className={props.className} />;
}

export function FilterIcon(props: IIconProps): React.ReactElement {
  return <Filter20Regular className={props.className} />;
}

export function CloseIcon(props: IIconProps): React.ReactElement {
  return <Dismiss20Regular className={props.className} />;
}

export function SuccessIcon(props: IIconProps): React.ReactElement {
  return <CheckmarkCircle20Regular className={props.className} />;
}

export function AppsIcon(props: IIconProps): React.ReactElement {
  return <Apps20Regular className={props.className} />;
}