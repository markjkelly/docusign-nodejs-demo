// The Connect Update model
 
var mongoose = require('mongoose')
  , Schema = mongoose.Schema;
 
var connectUpdateSchema = new Schema({
    _id:  String,
    envelopeStatus: String,
    statusTimestamp: {type: Date, default: Date.now}

});
 
module.exports = mongoose.model('ConnectUpdate', connectUpdateSchema);