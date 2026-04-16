import type { IconType } from "react-icons";
import { FaFaucet, FaTree } from "react-icons/fa";
import {
  GiSofa,
  GiBarbecue,
  GiGasStove,
  GiWaterTank,
  GiCircularSaw,
} from "react-icons/gi";
import {
  LuLampCeiling,
  LuLampFloor,
  LuLampDesk,
} from "react-icons/lu";
import { PiLampFill, PiSparkleFill } from "react-icons/pi";
import { MdOutlet, MdOutlineLightbulb, MdLocalMovies } from "react-icons/md";
import { IoGameController } from "react-icons/io5";

export type LightEntry = {
  entity_id: string;
  name: string;
  Icon: IconType;
};

export type LightSection = {
  title: string;
  entries: LightEntry[];
};

export const LIGHT_SECTIONS: LightSection[] = [
  {
    title: "First Floor",
    entries: [
      { entity_id: "light.living_room", name: "Living Room", Icon: GiSofa },
      { entity_id: "light.kitchen_main_lights", name: "Kitchen", Icon: FaFaucet },
      { entity_id: "light.living_room_fireplace", name: "Fireplace", Icon: LuLampCeiling },
      { entity_id: "light.backyard", name: "Backyard", Icon: GiBarbecue },
      { entity_id: "light.lady_lamp", name: "Lady Lamp", Icon: LuLampFloor },
      { entity_id: "light.kitchen_cabinet_lights", name: "Cabinets", Icon: GiGasStove },
      { entity_id: "switch.sonoff_1001816bdb", name: "Sonoff", Icon: MdOutlet },
      { entity_id: "light.dining_room_chandelier", name: "Dining Room", Icon: LuLampCeiling },
    ],
  },
  {
    title: "Front Yard",
    entries: [
      { entity_id: "light.front_yard", name: "Front Yard", Icon: FaTree },
      { entity_id: "switch.ihome_smartplug_05b4df_outlet", name: "String Lights", Icon: PiSparkleFill },
      { entity_id: "light.front_porch", name: "Front Porch", Icon: MdOutlineLightbulb },
    ],
  },
  {
    title: "Second Floor",
    entries: [
      { entity_id: "light.hue_ambiance_lamp_1", name: "Hue Lamp", Icon: PiLampFill },
      { entity_id: "light.lizs_lamp", name: "Liz's Lamp", Icon: PiLampFill },
    ],
  },
  {
    title: "Third Floor",
    entries: [
      { entity_id: "light.movie_theater", name: "Movie Theater", Icon: MdLocalMovies },
      { entity_id: "light.evans_office", name: "Evan's Office", Icon: IoGameController },
      { entity_id: "light.aidens_hatch_light", name: "Aiden's Hatch", Icon: LuLampDesk },
    ],
  },
  {
    title: "Basement",
    entries: [
      { entity_id: "light.basement_2", name: "Basement", Icon: GiWaterTank },
      { entity_id: "light.workshop", name: "Workshop", Icon: GiCircularSaw },
    ],
  },
];
