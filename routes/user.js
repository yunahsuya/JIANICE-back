import { Router } from 'express'
import * as user from '../controllers/user.js'
import * as auth from '../middlewares/auth.js'

const router = Router()

router.post('/', user.create)
router.post('/login', auth.login, user.login)
router.get('/profile', auth.token, user.profile)
router.patch('/profile', auth.token, user.updateProfile) // 新增這行
router.patch('/refresh', auth.token, user.refresh)
router.delete('/logout', auth.token, user.logout)
router.patch('/cart', auth.token, user.cart)
router.get('/cart', auth.token, user.getCart)

// 管理員專用路由
router.post('/admin', auth.token, user.createUserByAdmin)
router.get('/admin/all', auth.token, user.getAllUsers)
router.patch('/admin/:id', auth.token, user.updateUser)
router.delete('/admin/:id', auth.token, user.deleteUser)

export default router
