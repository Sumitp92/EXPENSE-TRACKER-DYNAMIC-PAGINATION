const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../util/databases'); 

const DownloadHistory = sequelize.define('Downloadhistory', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    file_url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    download_date: {
        type: DataTypes.DATE,
        allowNull: false,
    },
});

module.exports = DownloadHistory;
