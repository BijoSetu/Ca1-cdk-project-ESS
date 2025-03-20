import { MovieReview } from "../shared/types";

export const movieReviews : MovieReview[]  = [
    {
      MovieId: 1,
      ReviewId: 101,
      ReviewerId: "john.doe@example.com",
      ReviewDate: "2025-01-20",
      Content: "A fantastic movie with stunning visuals and a great storyline.",
      Translations: {
        "ml": "test",
      }
    },
    {
      MovieId: 1,
      ReviewId: 102,
      ReviewerId: "jane.smith@example.com",
      ReviewDate: "2025-01-21",
      Content: "An average movie, good for a one-time watch.",
      Translations: {
        "ml": "test",
      }
    },
    {
      MovieId: 2,
      ReviewId: 103,
      ReviewerId: "mark.jones@example.com",
      ReviewDate: "2025-02-10",
      Content: "One of the best performances by the lead actor!",
      Translations: {
        "ml": "test",
      }
    },
    {
      MovieId: 3,
      ReviewId: 104,
      ReviewerId: "lisa.brown@example.com",
      ReviewDate: "2025-03-05",
      Content: "The storyline was a bit weak, but the action scenes were great.",
      Translations: {
        "ml": "test",
      }
    },
    {
      MovieId: 2,
      ReviewId: 105,
      ReviewerId: "tom.wilson@example.com",
      ReviewDate: "2025-02-15",
      Content: "A must-watch! The direction and cinematography were top-notch.",
      Translations: {
        "ml": "test",
      }
    },
  ];
  