[![npm package](https://img.shields.io/npm/v/ember-orchestrate.svg?style=flat-square)](https://www.npmjs.org/package/ember-orchestrate)
[![build status](https://img.shields.io/travis/chadtmiller/ember-orchestrate.svg?style=flat-square)](https://travis-ci.org/chadtmiller/ember-orchestrate)

Ember Orchestrate
=================

An Ember Data adapter for the [Orchestrate.io](https://orchestrate.io) API.

**Note: This is still a WIP. If you have any issues or questions, please add them [here](https://github.com/chadtmiller/ember-orchestrate/issues).**

## Getting Started with Orchestrate

Using this addon requires an Orchestrate.io account. You can
[sign up here](https://orchestrate.io) for a free account.

## Usage

### Installation

From within your Ember CLI application run the command:

```bash
ember install:addon ember-orchestrate
```

which is equivalent to:

```bash
npm install --save ember-orchestrate
ember g ember-orchestrate
```

The `ember-orchestrate` generator will install a node-http-proxy server which
is required in order to make requests to the Orchestrate.io API. You will also
need to set en environment variable with an api key provided from the
Orchestrate.io dashboard.

```bash
export ORCHESTRATE_API_KEY=...
```

This is a quick way to setup up a development environment, however, in
production you will need route requests to your own server. You can do this
by simply changing the host address on the main Orchestrate adapter.

```javascript
// app/adapters/application.js
import OrchestrateAdapter from 'ember-orchestrate/adapter';

export default OrchestrateAdapter.extend({
  host: 'http://your-api.com'
});
```

### Setting up the adapter and serializer

```javascript
// app/adapters/application.js
import OrchestrateAdapter from 'ember-orchestrate/adapter';

export default OrchestrateAdapter.extend();

// app/serializers/application.js
import OrchestrateSerializer from 'ember-orchestrate/serializer';

export default OrchestrateSerializer.extend();
```

### Defining models

Defining models is the same as the existing [Ember Data](http://emberjs.com/guides/models/defining-models/) API.
Models defined with the `DS.Model` class will interact with an Orchestrate
collection of the same name. That is, a model defined as `user`
will make requests to a collection called `users` by default. In
addition, all attributes defined with `DS.attr` will persist to the collection
when a record is saved/updated.

```javascript
// app/models/user.js
import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
  email: DS.attr('string')
});
```

#### What if my collection is named differently?

If you would like to customize the name of the collection for a model,
you can create a model-specific adapter:

```javascript
// app/serializers/user.js
import OrchestrateSerializer from 'ember-orchestrate/serializer';

export default OrchestrateSerializer.extend({
  pathForType () {
    return 'custom-users-collection';
  }
});
```

### Defining relationships

`ember-orchestrate` currently supports `One-To-One`, `One-To-Many`, and
`Many-To-Many` relationships using Orchestrate's graph API. For example,
consider the following model definitions:

```javascript
// app/models/post.js
import DS from 'ember-data';

export default DS.Model.extend({
  comments: DS.hasMany('comment')
});

// app/models/comment.js
import DS from 'ember-data';

export default DS.Model.extend({
  post: DS.belongsTo('post')
});
```

When a comment is saved, the adapter will make three requests: one to
create the comment, one to relate the post to the comment, and one to
relate the comment to the post. For example, the following

```javascript
// ... some controller

var post = this.get('post'); // reference to a post record
var comment = this.store.createRecord('comment', {
  post: post
});

comment.save();
```

will make the these requests:

```
=> POST orchestrate/v0/comments
=> PUT orchestrate/v0/comments/07908e521720677f/relation/post/posts/071d7e029320fb45
=> PUT orchestrate/v0/posts/071d7e029320fb45/relation/comments/comments/07908e521720677f
```

#### Removing relationships

If you want to delete a record and remove all relationships, simply use
the `destroyRecord` method on the record.

In the case you have a `Many-To-Many` relationship and you want to dissociate
a record from another, you can remove the relation with the `destroyRelation`
method on through an instance of `DS.ManyArray`.

For example, the following will remove a tag relation from a post (assuming
you've already defined a `Many-To-Many` relationship for the post and tag
models):

```handlebars
// ... post view template

{{#each tag in post.tags}}
  {{tag.name}}
  <button {{action "removeTag" tag}}>x</button>
{{/each}}
```

```javascript
// ... some controller

actions: {
  removeTag (tagRecord) {
    var post = this.get('post');
    post.get('tags').then(tags => {
      tags.destroyRelation(tag);
    });
  }
}
```

### Finding records

#### Find records of a type

```javascript
var posts = this.store.find('post'); // will return a max of 100 records by default
```

If you need to show more than 100 records at a time, the `find` and `findQuery`
method will make recursive requests to load records up to the specified limit.

```javascript
var posts = this.store.find('post', { limit: 200 }); // will make two requests

// => GET orchestrate/v0/posts?limit=100
// => GET orchestrate/v0/posts?limit=100&offset=100
```

#### Finding a single record

```javascript
var post = this.store.find('post', '07908e521720677f');
```

#### Querying for records

The Orchestrate.io API allows collections to be queried using [Lucene Query Parser Syntax](http://lucene.apache.org/core/4_3_0/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#Overview).

To search a collection with the `Ember-Orchestrate-Adapter`, all you
have to do is pass a plain object to the `findQuery` method with a
`query` param.

For example, we could search for all posts that include the word
`noSQL`:

```javascript
var noSQLPosts = this.store.findQuery('post', { query: 'noSQL' });
```

#### Loading more records

Additional records can be requested with the `loadMore` method attached to a
`findQuery` response. For example,

```javascript
var posts = this.get('posts'); // the response returned by findQuery('post')

posts.loadMore();
```

will load 100 more post records into the store. There is also a boolean property
on all responses returned by `findQuery` called `hasNext`. If this property
is true, there are more records that can be requested from database.

For example, the `hasNext` property could be used show or hide a "load more"
button for a list of posts.

```handlebars
// ... posts index view

{{#each post in posts}}
  {{post.title}}
{{/each}}

{{#if posts.hasNext}}
  <button {{action "loadMorePosts"}}>Load more</button>
{{/if}}
```

```javascript
// ... some controller

actions: {
  loadMorePosts () {
    this.get('posts').loadMore();
  }
}
```

## Development

* `git clone` this repository
* `npm install`
* `bower install`
* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
