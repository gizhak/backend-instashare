// One-time script to add imgUrl to users who don't have one
import { MongoClient } from 'mongodb';

const url = 'mongodb://127.0.0.1:27017';
const dbName = 'instashare_db';

async function updateUsersImages() {
    const client = new MongoClient(url);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const usersCollection = db.collection('user');

        // Find all users without imgUrl
        const usersWithoutImage = await usersCollection
            .find({ imgUrl: { $exists: false } })
            .toArray();

        console.log(
            `Found ${usersWithoutImage.length} users without imgUrl`
        );

        // Update each user with a random avatar
        const updatePromises = usersWithoutImage.map((user, index) => {
            const randomNum = Math.floor(Math.random() * 70) + 1;
            return usersCollection.updateOne(
                { _id: user._id },
                { $set: { imgUrl: `https://i.pravatar.cc/150?img=${randomNum}` } }
            );
        });

        await Promise.all(updatePromises);
        console.log('✅ All users updated with imgUrl');

        // Also update existing posts to include imgUrl in by field
        const postsCollection = db.collection('post');
        const posts = await postsCollection.find({}).toArray();

        console.log(`Updating ${posts.length} posts...`);

        for (const post of posts) {
            if (post.by && post.by._id) {
                const user = await usersCollection.findOne({ _id: post.by._id });
                if (user && user.imgUrl) {
                    await postsCollection.updateOne(
                        { _id: post._id },
                        { $set: { 'by.imgUrl': user.imgUrl } }
                    );
                }
            }
        }

        console.log('✅ All posts updated');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.close();
    }
}

updateUsersImages();
