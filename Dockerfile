FROM ggrossetie/asciidoctor-web-pdf:1.0.0-alpha.16
# Install make
USER root
RUN apk add --quiet --no-cache --update make \
     && fc-cache -f
# Copy app
COPY --chown=asciidoctor:asciidoctor asciislide /asciislide
# Volumes to be mounted
VOLUME /asciislide/src
# Set user as the upstream image does
USER asciidoctor
WORKDIR /asciislide
ENTRYPOINT ["sh", "-c"]