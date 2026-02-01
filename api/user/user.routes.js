import express from 'express'

import { requireAuth, requireAdmin } from '../../middlewares/requireAuth.middleware.js'

import { getUser, getUsers, deleteUser, updateUser, getRemovedUsers, reactivateUser } from './user.controller.js'

const router = express.Router()

router.get('/', getUsers)
router.get('/removed', getRemovedUsers)
router.get('/:id', getUser)
router.put('/:id', requireAuth, updateUser)
router.post('/:id/reactivate', reactivateUser)
router.delete('/:id', requireAuth, deleteUser)

export const userRoutes = router