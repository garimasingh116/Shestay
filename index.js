import * as dotenv from 'dotenv';
dotenv.config();

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';


import { HuggingFaceTransformersEmbeddings }
from '@langchain/community/embeddings/huggingface_transformers';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

async function indexDocument() {

  try {

    const PDF_PATH = './sshe.pdf';

    
    const pdfLoader = new PDFLoader(PDF_PATH);

    const rawDocs = await pdfLoader.load();

    console.log("pdf loaded");

    
    const textSplitter =
      new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

    const chunkedDocs =
      await textSplitter.splitDocuments(rawDocs);

    console.log("pdf chunked");
    console.log("chunks:", chunkedDocs.length);

    
    const embeddings =
      new HuggingFaceTransformersEmbeddings({
        model: "Xenova/all-MiniLM-L6-v2",
      });

    console.log("embedding created");

    
    const testEmbedding =
      await embeddings.embedQuery("hello");

    console.log("embedding dimension:",
      testEmbedding.length);

    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const pineconeIndex =
  pinecone
    .Index(process.env.PINECONE_INDEX_NAME)
    .namespace("default");

    console.log("pinecone index connected");

    
    await PineconeStore.fromDocuments(
      chunkedDocs,
      embeddings,
      {
        pineconeIndex,
        namespace: "default",
        maxConcurrency: 5,
      }
    );

    console.log("all done");

  } catch (error) {

    console.error(error);

  }
}

indexDocument();