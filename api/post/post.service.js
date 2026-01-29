import { ObjectId } from 'mongodb';

import { logger } from '../../services/logger.service.js';
import { makeId } from '../../services/util.service.js';
import { dbService } from '../../services/db.service.js';
import { asyncLocalStorage } from '../../services/als.service.js';

export const postService = {
	query,
	getById,
	removePost,
	addPost,
	updatePost,
	addPostComment,
	removePostComment,
};

async function query(filterBy = { txt: '' }) {
	try {
		// const criteria = _buildCriteria(filterBy)
		// const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('post');
		// var postCursor = await collection.find(criteria, { sort })

		const posts = collection.toArray();
		return posts;
	} catch (err) {
		logger.error('cannot find posts', err);
		throw err;
	}
}

async function getById(postId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(postId) };

		const collection = await dbService.getCollection('post');
		const post = await collection.findOne(criteria);

		post.createdAt = post._id.getTimestamp();
		return post;
	} catch (err) {
		logger.error(`while finding post ${postId}`, err);
		throw err;
	}
}

async function removePost(postId) {
	const { loggedinUser } = asyncLocalStorage.getStore();
	//const { _id: ownerId, isAdmin } = loggedinUser

	try {
		const criteria = {
			_id: ObjectId.createFromHexString(postId),
		};
		// if (!isAdmin) criteria['owner._id'] = ownerId

		const collection = await dbService.getCollection('post');
		const res = await collection.deleteOne(criteria);

		if (res.deletedCount === 0) throw 'Not your post';
		return postId;
	} catch (err) {
		logger.error(`cannot remove post ${postId}`, err);
		throw err;
	}
}

async function addPost(post) {
	try {
		const collection = await dbService.getCollection('post');
		await collection.insertOne(post);

		return post;
	} catch (err) {
		logger.error('cannot insert post', err);
		throw err;
	}
}

async function updatePost(post) {
	const postToSave = {
		txt: post.txt,
		tags: post.tags,
		likedBy: post.likedBy,
		imgUrl: post.imgUrl,
		createdAt: post.createdAt,
		comments: post.comments,
		by: post.by,
	};

	try {
		const criteria = { _id: ObjectId.createFromHexString(post._id) };

		const collection = await dbService.getCollection('post');
		await collection.updateOne(criteria, { $set: postToSave });

		return post;
	} catch (err) {
		logger.error(`cannot update post ${post._id}`, err);
		throw err;
	}
}

async function addPostComment(postId, comment) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(postId) };
		comment.id = makeId();

		const collection = await dbService.getCollection('post');
		await collection.updateOne(criteria, { $push: { comments: comment } });

		return comment;
	} catch (err) {
		logger.error(`cannot add post comment ${postId}`, err);
		throw err;
	}
}

async function removePostComment(postId, commentId) {
	try {
		const criteria = { _id: ObjectId.createFromHexString(postId) };

		const collection = await dbService.getCollection('post');
		await collection.updateOne(criteria, {
			$pull: { comments: { id: commentId } },
		});

		return commentId;
	} catch (err) {
		logger.error(`cannot remove post comment ${postId}`, err);
		throw err;
	}
}
