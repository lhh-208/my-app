const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const User = require('./user');
const app = express();
const PORT = process.env.PORT || 6000;

// 连接数据库
connectDB();

app.use(express.json());

// 注册路由
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Register Error' });
  }
});

// 登录路由
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ username }, 'your_jwt_secret', { expiresIn: '1h' });
      res.send({ message: 'Login successful', token });
    } else {
      res.status(401).send({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: '登陆失败，请检查账户名以及密码' });
  }
});

// 受保护的路由示例
app.get('/api/protected', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, 'your_jwt_secret', (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      res.send({ message: 'This is a protected route', user });
    });
  } else {
    res.sendStatus(401);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});