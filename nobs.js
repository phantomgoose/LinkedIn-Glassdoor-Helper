// base API url to send requests to
const base_glassdoor_url = `https://api.glassdoor.com/api/api.htm?t.p=${
  glassdoor_api.partner_id
}&t.k=${glassdoor_api.key}&userip=${
  glassdoor_api.my_ip
}&useragent=${encodeURIComponent(
  navigator.userAgent
)}&format=json&v=1&action=employers`;

$(document).ready(function() {
  $(document).on("DOMNodeInserted", ".no-crappy-jobs", function(e) {
    $(this).fadeIn(500);
  });
  setTimeout(() => {
    let elements = document.getElementsByClassName("job-card__company-name");
    let company;
    let location;
    let json_queue = new AjaxQueue();
    if (!elements) {
      console.log(
        "NoCrappyJobs: No jobs found, crappy or otherwise. Try refreshing the page?"
      );
      return;
    }
    // get company reviews for each company/location pair
    Array.prototype.forEach.call(elements, el => {
      company = el.innerText;
      location = el.nextElementSibling.innerText.slice(12);

      json_queue.add({
        url:
          base_glassdoor_url +
          `&q=${encodeURIComponent(company)}&l=${encodeURIComponent(location)}`,
        dataType: "json",
        success: data => {
          let employers = data.response.employers;
          let results;
          if (employers.length > 0) {
            let employer = employers[0];
            results = `overall: ${formatRating(
              employer.overallRating
            )}, comp: ${formatRating(
              employer.compensationAndBenefitsRating
            )}, culture: ${formatRating(
              employer.cultureAndValuesRating
            )}, leadership: ${formatRating(
              employer.seniorLeadershipRating
            )}, work/life balance: ${formatRating(
              employer.workLifeBalanceRating
            )}`;
          } else {
            results = "no rating found";
          }
          $(el).append("</br><span class='no-crappy-jobs' hidden>Rating: " + results + "</span>");
        },
        error: error => {
          $(el).append(
            "</br><span class='no-crappy-jobs' hidden>NoCrappyJobs failed to fetch reviews. Probably rate-limited by Glassdoor API. Try refreshing the page in ~30 seconds.</span>"
          );
          console.log(error);
        },
      });
    });
  }, 3000);
});

// shamelessly appropriated from SO (with minor changes) https://stackoverflow.com/questions/4785724/queue-ajax-requests-using-jquery-queue
// queues up ajax requests and runs them at a specified interval
class AjaxQueue {
  constructor() {
    this.reqs = [];
    this.requesting = false;
    this.interval = 1500;
  }
  add(req) {
    this.reqs.push(req);
    this.next();
  }
  next() {
    if (this.reqs.length === 0) {
      return;
    }
    if (this.requesting === true) {
      return;
    }
    let req = this.reqs.splice(0, 1)[0];
    let complete = req.complete;
    let self = this;
    if (req._run) {
      req._run(req);
    }
    // overwrite ajax.complete function to call next at a delay
    req.complete = function() {
      setTimeout(() => {
        if (complete) {
          complete.apply(this, arguments);
        }
        self.requesting = false;
        self.next();
      }, self.interval);
    };
    // overwrite ajax.error function to cancel remaining requests in the queue if even one of them fails (which probably means we got throttled by glassdoor)
    let error = req.error;
    req.error = function() {
      if (error) {
        error.apply(this, arguments);
        self.purge();
      }
    };
    this.requesting = true;
    $.ajax(req);
  }
  purge() {
    console.log("NoCrappyJobs: remaining requests canceled.");
    this.requesting = false;
    this.reqs = [];
  }
}

function formatRating(rating) {
  let color;
  let parsed_rating = parseFloat(rating);
  if (parsed_rating >= 4) {
    color = "green";
  } else if (parsed_rating >= 3) {
    color = "yellow";
  } else {
    color = "red";
  }
  return `<span style='border-bottom:thick solid ${color};1px;'>${
    rating
  }</span>`;
}
