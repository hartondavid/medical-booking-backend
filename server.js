// server.mjs (handles starting the server)
import app from './index.mjs';

const port = process.env.PORT || 8080;

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
});
