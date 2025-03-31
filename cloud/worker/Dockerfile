FROM nvidia/cuda:11.7.1-base-ubuntu22.04

RUN apt-get update && \
    apt-get install -y  python3 python3-pip git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*


WORKDIR /root

COPY ./worker.py worker.py
COPY ./skillset/ skillset
COPY ./requirements.txt requirements.txt

RUN python3 -m pip install torch torchvision
RUN python3 -m pip install -r requirements.txt


ENTRYPOINT ["python3", "worker.py"]
