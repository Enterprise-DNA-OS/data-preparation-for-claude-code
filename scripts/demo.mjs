import {getDb} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {execute,human} from './prep.mjs';
const db=await getDb();
try{await migrate(db);await seed(db);for(const ref of ['TOTALS','REGIONS'])console.log(human(await execute(db,['run',`--ref=${ref}`,'--actor=demo'])));console.log(human(await execute(db,['weekly-review'])));}finally{await db.close();}
