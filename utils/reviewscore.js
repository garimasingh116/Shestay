function calculateReviewScore(reviews){

    if(reviews.length === 0){
        return 50;
    }

    let score = 0;

    reviews.forEach(review => {

        if(review.feltSafe){
            score += 30;
        }

        if(review.safeForSoloWomen){
            score += 30;
        }

        score += review.rating * 8;

    });

    return Math.round(
        score / reviews.length
    );
}

module.exports = calculateReviewScore;