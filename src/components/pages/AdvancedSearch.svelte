<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import type { SearchResult } from "@/global";
import { url as formatUrl } from "@/utils/url-utils";

export let title = i18n(I18nKey.search);
export let description = "";
type Post = { url:string; title:string; description:string; image:string; published:number; category:string; tags:string[]; searchText:string };
type Result = SearchResult & { image?:string; published?:number; category?:string; tags?:string[]; page?:boolean };
let keyword = "", results:Result[] = [], loading = false, ready = false, timer:NodeJS.Timeout, cache:Post[]|null = null;

const esc = (v:string) => v.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] || c));
const hi = (v:string, q:string) => { const w=q.trim(); if(!w)return esc(v); const e=w.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&"); return esc(v).replace(new RegExp(e,"gi"), m => "<mark>"+m+"</mark>"); };
const clean = (v:string) => v.replace(/<[^>]*>/g,"");
const norm = (v:string) => { try { return new URL(v,window.location.origin).pathname.replace(/\/?$/,"/"); } catch { return v; } };
const date = (v?:number) => v ? new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"short",day:"numeric"}).format(new Date(v)) : "";
const posts = async () => { if(cache)return cache; const r=await fetch(formatUrl("/api/allPostMeta.json")); cache=r.ok?await r.json():[]; return cache as Post[]; };
const local = async (q:string):Promise<Result[]> => (await posts()).filter(p => [p.searchText,p.title,p.description,p.category,...p.tags].join(" ").toLowerCase().includes(q.trim().toLowerCase())).map(p => ({url:p.url,meta:{title:hi(p.title,q)},excerpt:hi(p.description||p.title,q),image:p.image,published:p.published,category:p.category,tags:p.tags}));
const enrich = async (items:SearchResult[]):Promise<Result[]> => { const map=new Map((await posts()).map(p=>[norm(p.url),p])); return items.map(item => { const p=map.get(norm(item.url)); return p?{...item,image:p.image,published:p.published,category:p.category,tags:p.tags}:{...item,page:true}; }); };

const search = async () => {
 if(!ready || !keyword.trim()){results=[];return;} loading=true;
 try { let found:SearchResult[]=[]; if(window.pagefind){ const r=await window.pagefind.search(keyword); found=await Promise.all(r.results.map(async item=>{const {content:_content,...data}=await item.data();return data;})); } results=found.length?await enrich(found):await local(keyword); }
 catch(e){console.error("Search error:",e);results=[];} finally{loading=false;}
};
onMount(()=>{const init=async()=>{ready=true;keyword=new URLSearchParams(location.search).get("q")||"";if(keyword)await search();}; if(window.pagefind||import.meta.env.DEV)init();else {document.addEventListener("pagefindready",init,{once:true});document.addEventListener("pagefindloaderror",init,{once:true});}});
const input=()=>{clearTimeout(timer);timer=setTimeout(search,260);};
</script>

<section class="search-page" aria-labelledby="search-page-title">
 <header class="hero">
  <p class="eyebrow"><i></i>RAIN'S ARCHIVE</p>
  <h1 id="search-page-title">{title}</h1>
  <p>{description || "从项目复盘、博客改造到零散思考，把写过的内容重新找回来。"}</p>
  <div class="field">
   <label class="sr-only" for="search-input">{title}</label><Icon icon="material-symbols:search-rounded" />
   <input id="search-input" type="search" placeholder="输入关键词，搜索文章与页面" bind:value={keyword} on:input={input} />
   <small>{keyword ? (loading ? "正在检索" : "找到 "+results.length+" 条") : "试试：AI、自动上架、博客"}</small>
  </div>
 </header>
 <div class="result-head">{#if keyword && !loading && results.length}<p><strong>{results.length}</strong> 条和「{keyword}」有关的记录</p><span>文章和站内页面按相关度排列</span>{:else if !keyword}<p>输入一个词，开始翻找这座小小的内容档案室。</p>{/if}</div>
 {#if loading}
  <div class="empty"><Icon icon="svg-spinners:ring-resize" /><p>正在从文章里寻找线索…</p></div>
 {:else if results.length}
  <div class="list">{#each results as result, index}
   <article class="card" style={"--i:"+index}>
    <a href={result.url}>
     <div class:fallback={!result.image} class="cover">{#if result.image}<img src={formatUrl(result.image)} alt="" loading={index>1?"lazy":"eager"} />{:else}<b>{clean(result.meta.title).slice(0,1)||"R"}</b><Icon icon="material-symbols:article-rounded" />{/if}</div>
     <div class="body">
      <div class="meta"><span>{result.category || (result.page ? "页面" : "文章")}</span><time>{result.published ? date(result.published) : (result.page ? "站内页面" : "博客记录")}</time></div>
      <h2>{@html result.meta.title}</h2><p class="excerpt">{@html result.excerpt || "这条记录暂时没有摘要，点进去看看完整内容。"}</p>
      <footer><div>{#each (result.tags||[]).slice(0,3) as tag}<em>{tag}</em>{/each}</div><b>↗</b></footer>
     </div>
    </a>
   </article>
  {/each}</div>
 {:else if keyword}
  <div class="empty"><Icon icon="material-symbols:travel-explore-rounded" /><h2>暂时没找到这条线索</h2><p>换一个更短的关键词试试，或从“AI”“博客”“自动化”这类主题开始。</p></div>
 {:else}
  <div class="empty"><Icon icon="material-symbols:auto-stories-rounded" /><h2>从一段关键词开始</h2><p>搜索会覆盖文章标题、摘要、分类与标签。</p></div>
 {/if}
</section>

<style>
.search-page{--ink:color-mix(in oklab,var(--text-color,#26344d) 88%,#17233a);--muted:color-mix(in oklab,var(--text-color,#65738b) 57%,transparent);--line:color-mix(in oklab,var(--primary) 15%,var(--line-divider,#dfe7f3));padding-bottom:1rem}
.hero{position:relative;overflow:hidden;padding:clamp(1.45rem,3.6vw,2.65rem);border:1px solid var(--line);border-radius:clamp(1.25rem,2.6vw,1.9rem);background:linear-gradient(125deg,color-mix(in oklab,var(--card-bg) 89%,#eaf7ff 11%),var(--card-bg));box-shadow:0 1.1rem 2.8rem color-mix(in oklab,var(--primary) 10%,transparent)}
.hero:after{content:"";position:absolute;top:-11rem;right:-5rem;width:22rem;height:22rem;border-radius:50%;background:radial-gradient(circle,color-mix(in oklab,var(--primary) 23%,transparent),transparent 67%);pointer-events:none}.eyebrow{display:flex;gap:.55rem;align-items:center;margin:0 0 .7rem;color:var(--primary);font:800 .68rem/1 ui-monospace,monospace;letter-spacing:.18em}.eyebrow i{width:.48rem;height:.48rem;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6ed5ce);box-shadow:0 0 0 .25rem color-mix(in oklab,var(--primary) 10%,transparent)}.hero h1{margin:0;color:var(--ink);font:600 clamp(2.25rem,4.6vw,4rem)/1 Georgia,"Noto Serif SC",serif;letter-spacing:-.055em}.hero>p:not(.eyebrow){max-width:34rem;margin:.85rem 0 0;color:var(--muted);font-size:.92rem;line-height:1.8}
.field{display:flex;position:relative;align-items:center;gap:.7rem;margin-top:clamp(1.45rem,3vw,2rem);padding:.42rem .5rem .42rem 1rem;border:1px solid color-mix(in oklab,var(--primary) 17%,var(--line-divider));border-radius:1rem;background:color-mix(in oklab,var(--card-bg) 86%,transparent);box-shadow:inset 0 1px 0 rgb(255 255 255/.32),0 .7rem 1.7rem rgb(65 117 171/.08);transition:.22s}.field:focus-within{border-color:color-mix(in oklab,var(--primary) 58%,transparent);box-shadow:0 0 0 .24rem color-mix(in oklab,var(--primary) 11%,transparent);transform:translateY(-1px)}.field :global(svg){flex:0 0 auto;color:var(--primary);font-size:1.35rem}.field input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--ink);font-size:.94rem;line-height:2.35rem}.field small{padding:.42rem .65rem;border-radius:.66rem;color:color-mix(in oklab,var(--primary) 80%,var(--ink));background:color-mix(in oklab,var(--primary) 9%,transparent);font:700 .7rem/1.15 ui-monospace,monospace;white-space:nowrap}
.result-head{display:flex;min-height:3.9rem;align-items:end;justify-content:space-between;gap:1rem;padding:1.8rem 0 .8rem;color:var(--muted);font-size:.82rem}.result-head p{margin:0}.result-head strong{margin-right:.25rem;color:var(--primary);font-size:1.08rem}.result-head span{font-size:.72rem}.list{display:grid;gap:.85rem}.card{overflow:hidden;border:1px solid var(--line);border-radius:1.25rem;background:color-mix(in oklab,var(--card-bg) 90%,transparent);box-shadow:0 .7rem 1.8rem rgb(57 90 139/.055);animation:in .46s both;animation-delay:calc(var(--i)*45ms);transition:.25s}.card:hover{border-color:color-mix(in oklab,var(--primary) 34%,transparent);box-shadow:0 1rem 2.25rem rgb(57 90 139/.13);transform:translateY(-3px)}.card>a{display:grid;grid-template-columns:clamp(8.4rem,20vw,12.5rem) minmax(0,1fr);min-height:8.6rem;color:inherit;text-decoration:none}.cover{position:relative;display:grid;overflow:hidden;place-items:center;background:linear-gradient(145deg,#8bc9df,#789bd9 58%,#e9afce);isolation:isolate}.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,rgb(13 32 68/.08),transparent 55%,rgb(13 32 68/.2))}.cover img{width:100%;height:100%;object-fit:cover;transition:transform .65s cubic-bezier(.2,.7,.2,1)}.card:hover img{transform:scale(1.075)}.fallback b{z-index:1;color:#fff;font:600 clamp(2.5rem,5vw,4.6rem)/1 Georgia,serif}.fallback :global(svg){position:absolute;right:.85rem;bottom:.75rem;z-index:1;color:rgb(255 255 255/.6);font-size:1.35rem}.body{display:flex;min-width:0;flex-direction:column;padding:1.05rem 1.25rem 1rem}.meta{display:flex;gap:.55rem;color:var(--muted);font:700 .68rem/1.1 ui-monospace,monospace}.meta span{color:color-mix(in oklab,var(--primary) 82%,var(--ink))}.meta span:before{content:"";display:inline-block;width:.35rem;height:.35rem;margin-right:.36rem;border-radius:50%;background:currentColor}.meta time:before{content:"·";margin-right:.55rem}.body h2{display:-webkit-box;overflow:hidden;margin:.48rem 0 0;color:var(--ink);font:600 clamp(1.13rem,2.2vw,1.42rem)/1.26 Georgia,"Noto Serif SC",serif;letter-spacing:-.035em;-webkit-box-orient:vertical;-webkit-line-clamp:2;transition:color .22s}.card:hover h2{color:var(--primary)}.excerpt{display:-webkit-box;overflow:hidden;margin:.48rem 0 0;color:var(--muted);font-size:.81rem;line-height:1.63;-webkit-box-orient:vertical;-webkit-line-clamp:2}.body footer{display:flex;align-items:center;justify-content:space-between;gap:.7rem;margin-top:auto;padding-top:.75rem}.body footer div{display:flex;min-width:0;gap:.35rem;overflow:hidden}.body footer em{overflow:hidden;max-width:8.8rem;padding:.28rem .48rem;border-radius:.45rem;background:color-mix(in oklab,var(--primary) 6%,transparent);color:var(--muted);font-size:.66rem;font-style:normal;line-height:1;text-overflow:ellipsis;white-space:nowrap}.body footer>b{display:grid;width:1.85rem;height:1.85rem;place-items:center;border:1px solid color-mix(in oklab,var(--primary) 16%,transparent);border-radius:50%;color:var(--primary);background:color-mix(in oklab,var(--primary) 6%,transparent);transition:.25s}.card:hover footer>b{color:#fff;background:var(--primary);transform:translate(.16rem,-.16rem)}.empty{display:flex;min-height:17rem;flex-direction:column;align-items:center;justify-content:center;padding:2rem;border:1px dashed color-mix(in oklab,var(--primary) 22%,var(--line-divider));border-radius:1.25rem;background:color-mix(in oklab,var(--card-bg) 62%,transparent);color:var(--muted);text-align:center}.empty :global(svg){color:var(--primary);font-size:2rem}.empty h2{margin:1rem 0 0;color:var(--ink);font:600 1.38rem/1.2 Georgia,"Noto Serif SC",serif}.empty p{max-width:23rem;margin:.55rem 0 0;font-size:.83rem;line-height:1.75}:global(.card mark){padding:0 .08em;border-radius:.18em;color:var(--primary);background:color-mix(in oklab,var(--primary) 11%,transparent);font-weight:700}@keyframes in{from{opacity:0;transform:translateY(.75rem)}to{opacity:1;transform:translateY(0)}}@media(max-width:640px){.hero{padding:1.35rem}.field{gap:.45rem;padding-left:.78rem}.field small{display:none}.result-head{min-height:3.4rem;padding-top:1.25rem}.result-head span{display:none}.card>a{grid-template-columns:6.6rem minmax(0,1fr);min-height:7.9rem}.body{padding:.82rem .9rem}.body footer div{display:none}.body footer{padding-top:.48rem}}@media(prefers-reduced-motion:reduce){.card,.cover img,.body footer>b,.field{animation:none;transition:none}}
/* Search stays on the homepage typography system, not the portfolio's serif display type. */
.hero h1,
.fallback b,
.body h2,
.empty h2 {
	font-family: var(--font-active-sans) !important;
}

.hero h1 { font-weight: 700; line-height: 1.1; letter-spacing: -.04em; }
.fallback b { font-weight: 700; }
.body h2 { font-weight: 700; line-height: 1.35; letter-spacing: -.025em; }
.empty h2 { font-weight: 700; line-height: 1.35; }
</style>
