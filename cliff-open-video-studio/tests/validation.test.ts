import assert from "node:assert/strict";
import test from "node:test";
import { parseGenerationInput,validCredential } from "../src/lib/validation";
import { failure } from "../src/lib/higgsfield";
test("credential format",()=>{assert.equal(validCredential("id:secret"),true);assert.equal(validCredential("bad"),false)});
test("Seedance validation",()=>{assert.equal(parseGenerationInput({prompt:"x",duration:5,resolution:"720p",aspectRatio:"9:16",outputFormat:"mp4"}).duration,5);assert.throws(()=>parseGenerationInput({prompt:"x",duration:31,resolution:"720p",aspectRatio:"9:16",outputFormat:"mp4"}))});
test("credit error",()=>assert.equal(failure(403,{detail:"not_enough_credits"}).code,"insufficient_credits"));
