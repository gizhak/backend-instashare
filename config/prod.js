import 'dotenv/config';

export default {
	dbURL: process.env.MONGO_URL || 'mongodb+srv://decodingct_db_user:K63v3BqrhqTVjERY@instashare-cluster.ma2o12w.mongodb.net/?retryWrites=true&w=majority&tls=true',

	dbName: process.env.DB_NAME || 'instashare_db',
};
