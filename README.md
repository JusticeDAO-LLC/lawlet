# Lawlet - Legal Assistant Platform

![image](https://github.com/user-attachments/assets/10c07d6e-4bed-4182-a1d8-f4687d15f125)

*Originally from: [Devpost - Lawlet](https://devpost.com/software/lawlet)*

## Inspiration
We have been working on a MLops infrastructure for our stable diffusion startup. With experience in civil rights, we decided to pivot towards building a civil rights litigation platform that will connect litigants with lawyers by collecting their evidence and creating a marketplace for litigant-attorney matching.

**Team:**
- Benjamin Barber (Portland, Oregon)
- Manuel Otto (Germany)
- Kevin de Hann (Netherlands)

## What it does
The platform takes questions as input, performs KNN retrieval on the United States Code text, summarizes the US code, and generates answers based on the summarized text.

## How we built it
The system uses a Master-Worker architecture:
- Master accepts jobs from clients
- Workers execute tasks based on configuration
- TOML files define model weights and inference code locations
- Workers can be re-tasked dynamically

## Challenges we ran into
- Llama index performance limitations:
    - No GPU support for indexing
    - Index rebuilding on every load
    - Slow processing speed
- OpenAI throttling on KNN indexing requests
- Limited to 5,000 samples due to processing time
- Single US code statute retrieval to avoid token limits

## Accomplishments
- Completed core functionality in 12 hours
- Dedicated team effort (Manuel coding on his birthday!)
- Successfully implemented complex MLops infrastructure

## What we learned
- Importance of thorough testing
- Performance limitations of Llama-2 and Llama-index
- Challenges of large-scale legal text processing

## Future Plans
This demo is part of JusticeDAO's initiative. Before expanding into legal services, we plan to:
- Hire legal counsel
- Review prompt engineering
- Validate complaint generation pipelines
- Ensure legal compliance

