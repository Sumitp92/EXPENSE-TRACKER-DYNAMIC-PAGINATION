const Sequelize = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../util/databases');
const Authtable = require('./User'); 

const ForgotPasswordRequests = sequelize.define('ForgotPasswordRequests', {
    id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
        defaultValue: () => uuidv4(), 
    },
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: Authtable, 
            key: 'id', 
        },
    },
    isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true, 
    },
});

//(Many-to-One)
Authtable.hasMany(ForgotPasswordRequests, { foreignKey: 'userId' });
ForgotPasswordRequests.belongsTo(Authtable, { foreignKey: 'userId' });

module.exports = ForgotPasswordRequests;
