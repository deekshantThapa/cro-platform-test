const { StatusCodes } = require('http-status-codes');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../Models/userModel');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

const register = async (req, res) => {
  if (process.env.ALLOW_REGISTRATION !== 'true') {
    return res.status(StatusCodes.FORBIDDEN).json({ msg: 'Registration is disabled' });
  }

  const { name, email, password } = req.body;

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'name is required' });
  }
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'email is required' });
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ msg: `password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await userModel.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(StatusCodes.CONFLICT).json({ msg: 'A user with this email already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await userModel.create({
      name,
      email: normalizedEmail,
      password: hashedPassword
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({ msg: 'A user with this email already exists' });
    }
    if (err.name === 'ValidationError') {
      return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }
    throw err;
  }

  res.status(StatusCodes.CREATED).json({
    msg: 'User registered successfully',
    user: { id: user._id, name: user.name, email: user.email }
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'email and password are required' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: 'Server authentication is not configured' });
  }

  const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select('+password');

  const invalid = () => res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Invalid email or password' });

  if (!user) return invalid();

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) return invalid();

  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });

  res.status(StatusCodes.OK).json({
    msg: 'Login successful',
    token,
    user: { id: user._id, name: user.name, email: user.email }
  });
};

module.exports = { register, login };
