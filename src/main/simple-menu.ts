import { type Menu } from "@/stores/menuSlice";

const menu: Array<Menu | "divider"> = [
  {
    icon: "Home",
    title: "Dashboard",
   pathname:'/'
  },
  {
    icon: "MessageSquare",
    pathname: "/chat",
    title: "Chat",
  },
  {
    icon: "HardDrive",
    pathname: "/file-manager",
    title: "File Manager",
  },
  {
    icon: "Calendar",
    pathname: "/calendar",
    title: "Calendar",
  },
  "divider",
  {
    icon: "Users",
    title: "Users",
    subMenu: [
      {
        icon: "Activity",
        pathname: "/users-layout-1",
        title: "Layout 1",
      },
      {
        icon: "Activity",
        pathname: "/users-layout-2",
        title: "Layout 2",
      },
      {
        icon: "Activity",
        pathname: "/users-layout-3",
        title: "Layout 3",
      },
    ],
  },
  {
    icon: "Trello",
    title: "Profile",
    subMenu: [
      {
        icon: "Activity",
        pathname: "/profile-overview-1",
        title: "Overview 1",
      },
      {
        icon: "Activity",
        pathname: "/profile-overview-2",
        title: "Overview 2",
      },
      {
        icon: "Activity",
        pathname: "/profile-overview-3",
        title: "Overview 3",
      },
    ],
  },

  "divider",

];

export default menu;
