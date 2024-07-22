import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { type Themes } from "@/stores/themeSlice";
import { icons } from "@/components/Base/Lucide";
import sideMenu from "@/main/side-menu";
import simpleMenu from "@/main/simple-menu";
import simpleMenu2 from "@/main/simple-menu2";
import simpleMenu3 from "@/main/simple-menu3";
import simpleMenuRole2 from "@/main/simple-menu-role-2";
import topMenu from "@/main/top-menu";
import { useConfig } from '../config';

export interface Menu {
  icon: keyof typeof icons;
  title: string;
  badge?: number;
  pathname?: string;
  subMenu?: Menu[];
  ignore?: boolean;
}

export interface MenuState {
  menu: Array<Menu | string>;
}

const initialState: MenuState = {
  menu: [],
};

export const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {},
});

export const selectMenu = (layout: Themes["layout"]) => (state: RootState) => {
  const { config: initialContacts, role } = useConfig();
  console.log(initialContacts.name);
  console.log(role);
  if (layout == "top-menu") {
    return topMenu;
  }

  if (layout == "simple-menu") {
    if(initialContacts.name === "Infinity Pilates & Physiotherapy")
    {
      return simpleMenu2;
    } else if(initialContacts.name === "Tatapies")
    {
      return simpleMenu3;
    }
    else {
      if(role === "2"){
        return simpleMenuRole2;
      } else {
        return simpleMenu2;
      }
    }
  }

  return simpleMenu;
};

export default menuSlice.reducer;