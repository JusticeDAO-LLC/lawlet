// ../../architekt/api/server.js
import makeJsonParser from "koa-json-body";
var jsonParse = makeJsonParser({ fallback: true });
function post({ path }, router, func) {
  router.post(
    path,
    jsonParse,
    (ctx, next) => {
      ctx.state.payload = ctx.request.body;
      return next(ctx);
    },
    (ctx) => execute(ctx, func)
  );
}
async function execute(ctx, func) {
  try {
    ctx.type = "json";
    ctx.body = JSON.stringify(
      await func({
        ...ctx.state.payload,
        ctx
      }) || null
    );
  } catch (error) {
    let { expose, message, statusCode, ...extra } = error;
    console.warn(error);
    if (expose) {
      ctx.status = statusCode || 400;
      ctx.body = {
        message,
        ...extra
      };
    } else if (!statusCode || statusCode === 500) {
      ctx.status = 500;
      ctx.body = {
        message: "Server Error"
      };
    } else {
      ctx.status = statusCode;
      ctx.body = {
        message: `HTTP Error ${statusCode}`
      };
    }
  }
}

// virtual:./server/api.js
async function answerQuestion({ ctx, question }) {
  try {
    return await ctx.state.counsel({ question });
  } catch (e) {
    throw {
      message: e.message,
      expose: true
    };
  }
}
var api_default = function(router) {
  post({ path: "/api/answer" }, router, answerQuestion);
};

// server/apis.js
var apis_default = (router) => {
  api_default(router);
};
export {
  apis_default as default
};
