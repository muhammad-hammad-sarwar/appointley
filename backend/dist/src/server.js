import app from './app.js';
import { env } from './config/env.js';
const PORT = env.PORT;
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
