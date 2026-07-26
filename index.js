const express =require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
//prisma db 연결 
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./dev.db',
});
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = 3000;
app.use(express.json());

//토큰 꺼내옴 + 검증
function authMiddleware(req, res, next) {
    //헤더에서 토큰 꺼내기
    const authHeader = req.headers['authorization'];
    //꺼내기 실패시 나오는 멘트
    if (!authHeader){
        return res.status(401).json({ message: '토큰이 없습니다.' });
    }
    
    const token = authHeader.split(' ')[1];
    //토큰 검증하기
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    //검증 실패시 나오는 멘트
    } catch (err) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
}

//회원가입 - POST /signup - body: {email, password }
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    //findunique로 중복 이메일 막기
    const existingUser = await prisma.user.findUnique({ where: {email } });
    if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 이메일입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    //DB에 유저 추가
    const newUser = await prisma.user.create({
        data: {email, password: hashedPassword },
    });
    
    console.log('새로 생성된 유저:', newUser);
    res.status(201).json({message: '회원가입 성공!', user: newUser });
});


//로그인 - POST /login - body: { email, password }
app.post('/login', async (req, res) => {
    const {email, password} = req.body;
//DB에서 이메일로 유저 조회
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user){
        return res.status(401).json({message: '존재하지 않는 이메일입니다.'});
    }
//비밀번호 일치 여부 확인
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

// ===== 테스트/연습용 라우트 =====
//서버 생존 텍스트
app.get('/', (req, res) =>{
    res.send('서버가 살아있다!');
});

//화면에 안녕, {}출력
app.get('/hello/:name', (req, res) => {
    const name = req.params.name;
    res.send(`안녕, ${name}!`);
});

//캐릭터 기본값 설정 - 로그인(토큰 인증)해야만 접근 가능
app.get('/character', authMiddleware, (req, res) => {
    res.json({
        name: '용사',
        level: 1,
        hp: 100,
        exp: 0,
        owner: req.user.email //미들웨어가 붙여준 유저 정보 활용
    });
});

//서버 실행중입니다 텍스트
app.listen(PORT, () => {
    console.log(`서버 실행중입니다: http://localhost:${PORT}`);
});