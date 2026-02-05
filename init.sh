test -f config.env.yaml || cp config.env.example.yaml config.env.yaml &&
test -f config.chain.yaml || cp config.chain.example.yaml config.chain.yaml &&
test -f config.collection.yaml || cp config.collection.example.yaml config.collection.yaml &&
test -f config.market.yaml || cp config.market.example.yaml config.market.yaml
