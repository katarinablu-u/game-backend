const express =require('express');
const app = express();
const bcrypt = require('bcrypt');
const PORT = 3000;
const users = [];
const jwt = require('jsonwebtoken');
require('dotenv').config();
app.use(express.json());




app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { email, password: hashedPassword };
    users.push(newUser);

    console.log('현재 유저 목록:', users);
    res.status(201).json({message: '회원가입 성공!', user: newUser });
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;

    const user =users.find(user => user.email === email);
    if(!user){
        return res.status(401).json({message: '존재하지 않는 이메일입니다.'});
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
        return res.status(401).json({message: '비밀번호가 틀렸습니다.'});
    }

    const token = jwt.sign(
        { email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.status(200).json({message: '로그인 성공!', token });
});

app.get('/', (req, res) =>{
    res.send('서버가 살아있다!');
});


app.get('/hello/:name', (req, res) => {
    const name = req.params.name;
    res.send(`안녕, ${name}!`);
});

app.get('/character', (req, res) => {
    res.json({
        name: '용사',
        level: 1,
        hp: 100,
        exp: 0
    });
});

app.listen(PORT, () => {
    console.log(`서버 실행중입니다: http://localhost:${PORT}`);
});