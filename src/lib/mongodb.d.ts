declare module "lib/mongodb" {
  import { Db } from "mongodb";
  export function getDb(): Promise<Db>;
}
