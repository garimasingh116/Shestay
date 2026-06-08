const Listing = require("../models/listing");

module.exports.index = async (req, res) => {

    let filter = {};

    if (req.query.womenOnly) {
        filter.isWomenOnly = true;
    }

    if (req.query.femaleHost) {
        filter.hostGender = "female";
    }

    if (req.query.cctv) {
        filter.hasCCTV = true;
    }

    if (req.query.security24x7) {
        filter.security24x7 = true;
    }

    if (req.query.lateNightCheckin) {
        filter.lateNightCheckin = true;
    }

    if (req.query.wellLitArea) {
        filter.wellLitArea = true;
    }

    if (req.query.safetyRating) {
        filter.safetyRating = {
            $gte: Number(req.query.safetyRating)
        };
    }

    const allListing = await Listing.find(filter);

    res.render("listings/index", { allListing });

};