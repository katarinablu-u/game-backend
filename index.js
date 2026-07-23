const express =require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) =>{
    res.send('서버가 살아있다!');
});

app.listen(PORT, () => {
    console.log(`서버 실행중입니다: http://localhost:${PORT}`);
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