import app from './app';
import connectDB from './utils/db';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    })
})