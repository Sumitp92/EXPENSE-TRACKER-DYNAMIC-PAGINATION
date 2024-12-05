const Sequelize = require('sequelize');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 
const User = require('../model/User');
const expenseRecord = require('../model/expenses');
const Order = require('../model/order');
const ResetRequest = require('../model/ForgotPasswordRequests');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require('bcrypt');
require('dotenv').config();
const sequelize = require('../util/databases'); 
const nodemailer = require('nodemailer'); 


//below code is for loginsignup
const AddUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            isPremium: false, 
        });
        res.status(201).json({ success: true, message: 'User signed up successfully' });
    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ success: false, message: 'Error occurred during signup' });
    }
};


// Login User
const LoginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Incorrect password' });
        }
        const token = jwt.sign(
            { userId: user.id, isPremium: user.isPremium }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );
        res.status(200).json({ success: true, message: 'Login successful', token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isPremium: user.isPremium,
            },
        });
    } catch (error) {
        console.log('Error during login:', error);
        res.status(500).json({ success: false, message: 'Error occurred during login' });
    }
};



///below is for expense page 

// Add Expense
const addExp = async (req, res) => {
    try {
        const { amount, description, category } = req.body;

        if (!amount || !description || !category) {
            return res.status(400).json({ success: false, message: "Missing Expense" });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }
        const userExpenses = await expenseRecord.findAll({
            where: { userId: req.user.id },
        });

        let totalExpense = 0;
        if (userExpenses.length > 0) {
            totalExpense = userExpenses.reduce((total, expense) => total + expense.amount, 0);
        }

        totalExpense += parseFloat(amount); // Make sure amount is treated as a number
        const expense = await expenseRecord.create({
            amount,
            description,
            category,
            userId: req.user.id,
            totalexpense: totalExpense, 
        });
        res.status(201).json({ success: true, expense });
    } catch (error) {
        console.error('Error during expense addition:', error);
        res.status(500).json({ success: false, message: "Error adding expense", error: error.message });
    }
};

// Delete Expense
const delExp = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await expenseRecord.findOne({ where: { id, userId: req.user.id } });
        // if (!expense) {
        //     return res.status(404).json({ success: false, message: 'Expense not found' });
        // }
        await expense.destroy();
        res.status(200).json({ success: true, message: 'Expense deleted' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error deleting expense' });
    }
};

// Edit Expense
const editExp = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, description, category } = req.body;

        const expense = await expenseRecord.findOne({ where: { id, userId: req.user.id } });

        // if (!expense) {
        //     return res.status(404).json({ success: false, message: 'Expense not found or unauthorized' });
        // }

        expense.amount = amount;
        expense.description = description;
        expense.category = category;

        await expense.save();

        res.status(200).json({ success: true, expense });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error updating expense' });
    }
};

// Get Expenses
const getExp = async (req, res) => {
    try {
        const userId = req.user.id; 

        // console.log('Fetching expenses for user ID:', userId); 
        const expenses = await expenseRecord.findAll({ where: { userId } });

        // console.log('Fetched expenses:', expenses); 

        if (expenses.length === 0) {
            return res.status(404).json({ success: false, message: 'No expenses found for this user' });
        }
        res.status(200).json({ success: true, expenses }); 
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ success: false, message: 'Error fetching expenses', error: err.message });
    }
};

//below code is for premium user 
const buyPremium = async (req, res) => {

    try {
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const amount = 50000; 
        const razorpayOrder = await rzp.orders.create({
            amount,
            currency: 'INR',
            receipt: `order_rcptid_${Date.now()}`,
        });
        if (!razorpayOrder) throw new Error('Failed to create Razorpay order');
        res.status(201).json({
            key_id: process.env.RAZORPAY_KEY_ID,
            order: razorpayOrder,
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error.message);
        // res.status(500).json({ error: 'Error creating Razorpay order' });
    }
};


const updatePremiumStatus = async (req, res) => {
    try {
        const { payment_id, order_id } = req.body;
        if (!payment_id || !order_id) {
            return res.status(400).json({ error: 'Invalid request payload' });
        }
        const rzp = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const paymentVerification = await rzp.payments.fetch(payment_id);
        // console.log('Payment verification response:', paymentVerification);

        if (!paymentVerification || paymentVerification.status !== 'captured') {
            return res.status(400).json({ error: 'invalid payment ID' });
        }
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.isPremium = true;
        await user.save();
        const newOrder = await Order.create({
            orderId: order_id,
            paymentId: payment_id,
            status: 'success',
            userId: user.id,
        });
        const token = jwt.sign(
            { userId: user.id, isPremium: user.isPremium }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        console.log('Updated user:', user);
        res.status(200).json({ message: 'Transaction successful', token, order: newOrder });
    } catch (error) {
        console.error('Error updating premium status:', error.message);
        res.status(500).json({ error: 'Error updating premium status' });
    }
};


//below code is for premiumFeatures
  const showLeaderboard = async (req, res) => {
    try {
      const leaderboardData = await expenseRecord.findAll({
        attributes: [
          'userId',
          [sequelize.fn('SUM', sequelize.col('amount')), 'totalExpense'],
        ],
        group: ['userId', 'user.id'], 
        order: [[sequelize.literal('totalExpense'), 'DESC']],
        include: {
          model: User, 
          as: 'user', 
          attributes: ['name'], 
        },
      });
      const formattedLeaderboard = leaderboardData.map((record) => ({
        userName: record.user ? record.user.name : 'Unknown User',
        totalExpense: record.getDataValue('totalExpense'),
      }));
      res.status(200).json({ success: true, leaderboard: formattedLeaderboard });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({success: false,message: 'Error fetching leaderboard',error: error.message,});
    }
  };


  //below code is for forgot password

/// Set up the transporter using Brevo SMTP settings

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: '80b7ab001@smtp-brevo.com',
        pass: process.env.EMAIL_API_KEY,
    },
});

// Forgot Password
const forgotPassword = async (req, res) => {

    const { email } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User  not found' });
        }
        const resetId = uuidv4();
        await ResetRequest.create({
            id: resetId,
            userId: user.id,
            isActive: true,
            createdAt: new Date(),
        });
        const resetURL = `http://localhost:3000/password/resetpassword/${resetId}`;

        await transporter.sendMail({
            from: 'sumitpatil2062003@gmail.com',
            to: email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link to reset your password: ${resetURL}`,

        });
        res.status(200).json({ success: true, message: 'Reset link sent to your email' });
    } catch (error) {
        console.error('Error in forgot password', error);
        res.status(500).json({ success: false, message: 'Error processing request' });
    }
};


// Validate Reset Request

const validateResetRequest = async (req, res) => {
    const { resetId } = req.params;
    try {
        const resetRequest = await ResetRequest.findOne({
            where: { id: resetId, isActive: true },
        });
        if (!resetRequest) {
            return res.status(400).json({ success: false, message: 'expired reset link'});
        }
        const expirationTime = 60 * 60 * 1000; 
        const isExpired = Date.now() - new Date(resetRequest.createdAt).getTime() > expirationTime;
        if (isExpired) {
            return res.status(400).json({ success: false, message: 'Reset link has expired.' });
        }

        res.sendFile(path.join(__dirname, '../public/reset.html'));
    } catch (error) {
        console.error('Error validating reset link:', error);
        res.status(500).json({ success: false, message: 'Error validating reset link.' });
    }
};

// Reset Password

const updatePassword = async (req, res) => {
    const { resetId } = req.params;
    const { newPassword } = req.body;

    try {
        // Validate password
        if (!newPassword || newPassword.length < 2) {
            return res.status(400).json({ success: false, message: 'Password must be 2 characters long' });
        }
        const resetRequest = await ResetRequest.findOne({ where: { id: resetId, isActive: true } });
        if (!resetRequest) {
            return res.status(400).json({ success: false, message: ' expired reset link'});
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const user = await User.findByPk(resetRequest.userId);
        
        user.password = hashedPassword;
        await user.save();
        resetRequest.isActive = false;
        await resetRequest.save();
        res.status(200).json({ success: true, message: 'Password updated successfully.' });

    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ success: false, message: 'Error updating password.' });
    }
};
  
module.exports = {
    AddUser,
    LoginUser,
    getExp,
    addExp,
    delExp,
    editExp,
    buyPremium,
    updatePremiumStatus,
    showLeaderboard,
    forgotPassword,
    validateResetRequest,
    updatePassword,
};