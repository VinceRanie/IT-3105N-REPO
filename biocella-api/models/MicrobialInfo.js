const mongoose = require('mongoose');
const { Schema } = mongoose;

const microbialInfoSchema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
  code_name: String,
  accession_number: String,
  qr_code: String,
  image_url: String,
  description: String,
  // ...add more common fields you want to semi-enforce
  custom_fields: { type: Schema.Types.Mixed } // store flexible content here
}, { strict: true }); // strict applies only to root level

module.exports = mongoose.model('MicrobialInfo', microbialInfoSchema, 'Microbial_Info');