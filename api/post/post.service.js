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
	togglePostLike,
	toggleCommentLike,
};

async function query(filterBy = { txt: '' }) {
	try {
		// const criteria = _buildCriteria(filterBy)
		// const sort = _buildSort(filterBy)

		const collection = await dbService.getCollection('post');
		// var postCursor = await collection.find(criteria, { sort })

		const posts = collection.find().toArray();
		return posts;
	} catch (err) {
		logger.error('cannot find posts', err);
		throw err;
	}
}

async function getById(postId) {
	try {
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}

		const collection = await dbService.getCollection('post');
		const post = await collection.findOne(criteria);

		if (post._id && typeof post._id.getTimestamp === 'function') {
			post.createdAt = post._id.getTimestamp();
		}
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
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}
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
		let criteria;
		if (ObjectId.isValid(post._id) && post._id.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(post._id) };
		} else {
			criteria = { _id: post._id };
		}

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
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}
		comment.id = makeId();

		// Initialize likedBy as empty array if not exists
		if (!comment.likedBy) {
			comment.likedBy = [];
		}

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
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}

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

async function togglePostLike(postId, userId) {
	try {
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}
		const collection = await dbService.getCollection('post');

		// Get the post first
		const post = await collection.findOne(criteria);
		if (!post) {
			throw new Error('Post not found');
		}

		// Check if user already liked
		const likedBy = post.likedBy || [];
		const userIndex = likedBy.findIndex(id => id === userId);

		if (userIndex === -1) {
			// Add like
			await collection.updateOne(criteria, { $push: { likedBy: userId } });
		} else {
			// Remove like
			await collection.updateOne(criteria, { $pull: { likedBy: userId } });
		}

		// Return updated post
		const updatedPost = await collection.findOne(criteria);
		if (updatedPost._id && typeof updatedPost._id.getTimestamp === 'function') {
			updatedPost.createdAt = updatedPost._id.getTimestamp();
		}
		return updatedPost;
	} catch (err) {
		logger.error(`cannot toggle post like ${postId}`, err);
		throw err;
	}
}

async function toggleCommentLike(postId, commentId, userId) {
	try {
		let criteria;
		if (ObjectId.isValid(postId) && postId.length === 24) {
			criteria = { _id: ObjectId.createFromHexString(postId) };
		} else {
			criteria = { _id: postId };
		}
		const collection = await dbService.getCollection('post');

		// Get the post
		const post = await collection.findOne(criteria);
		if (!post) {
			throw new Error('Post not found');
		}

		// Find the comment
		const comment = post.comments.find(c => c.id === commentId);
		if (!comment) {
			throw new Error('Comment not found');
		}

		// Initialize likedBy if it's null or undefined
		if (!comment.likedBy || !Array.isArray(comment.likedBy)) {
			let updateCriteria;
			if (ObjectId.isValid(postId) && postId.length === 24) {
				updateCriteria = { _id: ObjectId.createFromHexString(postId), 'comments.id': commentId };
			} else {
				updateCriteria = { _id: postId, 'comments.id': commentId };
			}
			await collection.updateOne(updateCriteria, { $set: { 'comments.$.likedBy': [] } });
			comment.likedBy = [];
		}

		// Toggle like
		const likedBy = comment.likedBy || [];
		const userIndex = likedBy.findIndex(id => id === userId);

		if (userIndex === -1) {
			// Add like
			let updateCriteria;
			if (ObjectId.isValid(postId) && postId.length === 24) {
				updateCriteria = { _id: ObjectId.createFromHexString(postId), 'comments.id': commentId };
			} else {
				updateCriteria = { _id: postId, 'comments.id': commentId };
			}
			await collection.updateOne(updateCriteria, { $push: { 'comments.$.likedBy': userId } });
		} else {
			// Remove like
			let updateCriteria;
			if (ObjectId.isValid(postId) && postId.length === 24) {
				updateCriteria = { _id: ObjectId.createFromHexString(postId), 'comments.id': commentId };
			} else {
				updateCriteria = { _id: postId, 'comments.id': commentId };
			}
			await collection.updateOne(updateCriteria, { $pull: { 'comments.$.likedBy': userId } });
		}

		// Return updated post
		const updatedPost = await collection.findOne(criteria);
		if (updatedPost._id && typeof updatedPost._id.getTimestamp === 'function') {
			updatedPost.createdAt = updatedPost._id.getTimestamp();
		}
		return updatedPost;
	} catch (err) {
		logger.error(`cannot toggle comment like ${postId}/${commentId}`, err);
		throw err;
	}
}
