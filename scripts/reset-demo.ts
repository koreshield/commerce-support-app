import { DemoRepository } from "../src/lib/server/repository";

const repository = new DemoRepository(process.env.DEMO_DATABASE_PATH ?? "./data/commerce-support.sqlite");
repository.reset();
repository.close();
process.stdout.write("Synthetic demo data reset.\n");
