import 'dotenv/config';

export default {
	dbURL: process.env.MONGO_URL || 'mongodb+srv://elruddy_db_user:xOnevcvn85OG8rhw@instashare.o3lbblm.mongodb.net/?retryWrites=true&w=majority&tls=true',

	dbName: process.env.DB_NAME || 'instashare_db',
};
