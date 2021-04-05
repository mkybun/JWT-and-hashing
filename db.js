const { JsonWebTokenError } = require('jsonwebtoken');
const jwt = require('jsonwebtoken')
const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const config = {
  logging: false
};
const bcrypt = require('bcrypt')

if(process.env.LOGGING){
  delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', config);

const User = conn.define('user', {
  username: STRING,
  password: STRING
});

const Note = conn.define('note', {
  text: STRING
})

Note.belongsTo(User)
User.hasMany(Note)

User.addHook('beforeCreate', (user) => {
    user.password = bcrypt.hash(user.password, 5)
})


User.byToken = async(token)=> {
  try {
    const userToken = jwt.verify(token, process.env.JWT)
    
    const user = await User.findByPk(userToken.userId);
    if(user){
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;;
    throw error;
  }
  catch(ex){
    const error = Error('bad credentials');
    error.status = 401;;
    throw error;
  }
};

User.authenticate = async({ username, password })=> {
const user = await User.findOne({
    where: {
      username
    }
  });

  if(bcrypt.compare(password, user.password)){
    return jwt.sign({userId: user.id}, process.env.JWT)
  }
  
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async()=> {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw'},
    { username: 'moe', password: 'moe_pw'},
    { username: 'larry', password: 'larry_pw'}
  ];

  const notes = [{ text: 'hello' }, { text: 'hi' }, { text: 'hola' }]
  
  const [hello, hi, hola] = await Promise.all(notes.map(note => Note.create(note)))
  
  const [lucy, moe, larry] = await Promise.all(
    credentials.map( credential => User.create(credential))
  );

  await lucy.setNotes(hello)
  await moe.setNotes(hi)
  await larry.setNotes(hola)

  return {
    users: {
      lucy,
      moe,
      larry
    }
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note
  }
};