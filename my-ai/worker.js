/* המודל רץ כאן, בתהליך נפרד, כדי שהמסך לא ייתקע בזמן שהוא חושב */
import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.87";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = msg => handler.onmessage(msg);
