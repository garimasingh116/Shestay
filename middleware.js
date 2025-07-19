const Listing = require("./models/listing");
const Review = require("./models/review"); // ✅ Make sure model name is capitalized

module.exports.isLoggedIn = (req, res, next) => {
  console.log(req.path, "..", req.originalUrl);

  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  if (!req.user || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have the permission to edit");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

module.exports.isAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;

  const review = await Review.findById(reviewId); // ✅ Fix 1: Capital R, and use reviewId (correct spelling)

  if (!review) {
    req.flash("error", "Review not found");
    return res.redirect(`/listings/${id}`);
  }

  if (!review.author.equals(req.user._id)) { // ✅ Fix 2: Use 'review', not model name
    req.flash("error", "You don't have permission to delete this review");
    return res.redirect(`/listings/${id}`);
  }

  next();
};
