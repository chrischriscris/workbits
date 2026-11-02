export type Species = "human" | "frog" | "crab";

export type Status = "available" | "focus" | "away" | "meeting";

export type Hair = { style: string; color: string };
export type FacialHair = { style: string; color: string };
export type Eyes = { style: string; color: string };
export type Glasses = { style: string; color: string };
export type Headwear = { style: string; color: string };
export type Wings = { style: string; color: string };

export type Outfit = {
  top: string;
  topColor: string;
  bottom: string;
  bottomColor: string;
  shoes: string;
  shoesColor: string;
};

export type AvatarConfig = {
  species: Species;
  body: string;
  skin: string;
  belly?: string;
  hair?: Hair;
  facialHair?: FacialHair;
  eyes?: Eyes;
  glasses?: Glasses;
  headwear?: Headwear;
  outfit: Outfit;
  accessories: string[];
  palette: { primary: string; secondary: string; accent: string };
  wings?: Wings;
  voice?: { pitch: number };
  portraitUrl?: string;
};

export type SeedCharacter = {
  id: string;
  displayName: string;
  shortName: string;
  role: string;
  kind: "user" | "mascot";
  species: Species;
  status: Status;
  room: string;
  desk?: string;
  pet?: boolean;
  companionOf?: string;
  state?: "sleeping" | "idle";
  pose?: "sleeping" | "standing" | "sitting";
  avatar: AvatarConfig;
  companion?: { species: string; color: string; name: string };
  persona?: { vibe?: string; tagline?: string; props?: string[] };
  notes?: string;
  sourcePhoto?: string | null;
};

export type SeedPack = {
  version: number;
  id: string;
  name: string;
  description: string;
  privacy?: string;
  office: {
    name: string;
    template: string;
    spawnRoom: string;
    rooms: Array<{ id: string; name: string; type: string; private: boolean }>;
    desks: Array<{ id: string; room: string; assignedTo: string }>;
  };
  characters: SeedCharacter[];
};
