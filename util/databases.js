const Sequelize = require('sequelize') 

const sequelize = new Sequelize('expensetracker' , 'root' , '876722', {
dialect :'mysql',
host: 'localhost'
});

module.exports = sequelize ; 