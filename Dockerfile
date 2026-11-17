FROM ggrossetie/asciidoctor-web-pdf:1.0.3

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends make \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

COPY --chown=asciidoctor:asciidoctor asciislide /asciislide

VOLUME /asciislide/src

USER asciidoctor
WORKDIR /asciislide
ENTRYPOINT ["sh", "-c"]