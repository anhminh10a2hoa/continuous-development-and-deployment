FROM python:3.9

WORKDIR /service1

COPY index.py ./index.py
COPY requirements.txt ./requirements.txt

RUN pip install -r requirements.txt

COPY wait-for-it.sh ./service1/wait-for-it.sh
RUN chmod +x ./service1/wait-for-it.sh

# Wait for rabbitmq to be up
CMD ["./service1/wait-for-it.sh", "service2:8000", "--timeout=5", "--", "./service1/wait-for-it.sh", "monitor:8087", "--timeout=5", "--", "python", "index.py"]
