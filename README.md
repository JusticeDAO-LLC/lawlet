![image](https://github.com/user-attachments/assets/10c07d6e-4bed-4182-a1d8-f4687d15f125)

Originally from:  https://devpost.com/software/lawlet

Inspiration
We have been working on a MLops infrastructure for our stable diffusion startup. I have experience in civil rights, and we decided to pivot and move towards building a civil rights litigation platform, that will connect litigants with lawyers by collecting their evidence, and creating a marketplace for the litigants to match with attorneys.

Benjamin Barber attended virtually from Portland Oregon Manuel Otto attended virtually from Germany Kevin de Hann attended virtually from Netherlands

What it does
This is very simple, it takes your question as an input, does KNN retrieval on the United States Code text, summarizes the US code, then it generates an answer based on the summarized text.

How we built it
There is a Master, which accepts jobs from clients, and has workers that do its bidding. The master is task agnostic, but for each port you are running it on you have to provide it with a TOML file, which defines the location of the model weights and the inference code, such that the any worker in the worker pool can be re-tasked on the fly.

Challenges we ran into
Llama index is very very slow, and does not support GPU calculations of the indexes, and rebuilds the index on every load. OpenAI throttles the KNN indexing requests, and there is no progress bar on Llama index, so we have shipped with n=5000 samples, and right now I am waiting for the N=50,000 samples to finish building in ~6 hours, after which it will be delivered to the workers via s3. Also, we are only retrieving 1 US code statute so that we dont overflow the 2048 token, and then summarizing it if it is too long.

Accomplishments that we're proud of
that we literally did this all in 12 hours, Manuel Otto spent his birthday coding for the hackathon and not sleeping, and Benjamin Barber worked in the middle of the night.

What we learned
never trust that things will 'just work', llama-2 is slow s fuck, and so is Llama-index.

What's next for lawlet
this is just a demo for our group JusticeDAO, we dont want to offer legal services, until we have an attorney on hire, to review the prompt engineering and pipelines / stages that produce the complaints for legal correctness.
