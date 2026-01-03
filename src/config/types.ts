export interface WtConfig {
  postfix: string;
  copyFiles: string[];
  prepare: string[];
}

export const DEFAULT_CONFIG: WtConfig = {
  postfix: ".wt",
  copyFiles: [".env*"],
  prepare: [""],
};

export const CONFIG_FILE = "wt.config.json";
