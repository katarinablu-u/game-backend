const cors = require('cors');

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
app.use(cors());

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
        { userId: user.id, email: user.email },
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

//캐릭터 조회 -GET /character - 로그인(토큰 인증)해야만 접근 가능
app.get('/character', authMiddleware, async (req, res) => {
    //로그인한 유저 본인의 캐릭터 확인
    const character = await prisma.character.findUnique({
        where: { userId: req.user.userId }
    });
    //캐릭터 존재하지 않을시 
    if (!character) {
        return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    }

    res.json(character);
});

//캐릭터 생성 - POST /character - 로그인 필요
app.post('/character', authMiddleware, async (req, res) => {
    const { name } = req.body;

    //이미 캐릭터 있는지 확인
    const existingCharacter = await prisma.character.findUnique({
        where: { userId: req.user.userId }
    });
    if (existingCharacter) {
        return res.status(400).json({ message: '이미 캐릭터가 존재합니다.'});
    }

    //DB에 캐릭터 생성
    const newCharacter = await prisma.character.create({
        data: {
            name, 
            userId: req.user.userId
        }
    });

    res.status(201).json({ message: '캐릭터 생성 성공!', character: newCharacter });
});

//경험치 획득 및 레벨업 - POST /character/exp - body: { amount }
app.post('/character/exp', authMiddleware, async (req, res) => {
    const { amount } = req.body;

    //본인 캐릭터 조회
    const character = await prisma.character.findUnique({
        where: { userId: req.user.userId }
    });
    if(!character) {
        return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });
    }
    //캐릭터 경험치, 레벨, HP
    let newExp = character.exp + amount;
    let newLevel = character.level;
    let newHp = character.hp;
    //레벨업에 필요한 경험치
    const expToLevelUp = character.level * 100;
    //경험치가 기준을 넘으면 레벨업 
    if (newExp >= expToLevelUp) {
        newExp = newExp - expToLevelUp;
        newLevel = newLevel + 1;
        newHp = newHp + 20;
    }
    //변경된 정보 DB에 저장
    const updatedCharacter = await prisma.character.update({
        where: { userId: req.user.userId },
        data: {
            exp: newExp,
            level: newLevel,
            hp: newHp
        }
    });
    //성공적으로 실행됐을시 멘트
    res.status(200).json({ message: '경험치 획득!', character: updatedCharacter });
});

//서버 실행중입니다 텍스트
app.listen(PORT, () => {
    console.log(`서버 실행중입니다: http://localhost:${PORT}`);
});